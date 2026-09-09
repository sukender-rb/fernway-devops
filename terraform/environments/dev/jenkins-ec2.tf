# Dedicated EC2 host for Jenkins. Jenkins needs a real Docker daemon
# (jenkins/Dockerfile mounts /var/run/docker.sock), and EKS worker nodes
# run containerd instead of Docker — so Jenkins can't live inside the
# cluster itself. This box builds images with Docker, pushes to ECR,
# then uses kubectl (via the EKS access entry below) to update the
# cluster. Ansible (ansible/playbook.yml) configures this box after
# Terraform creates it: installs Docker, hardens SSH, etc.

variable "admin_cidr" {
  description = "CIDR allowed to reach Jenkins (22, 8080). 0.0.0.0/0 is fine to get moving today — tighten this to your own IP in the Phase 6 security pass."
  type        = string
  default     = "0.0.0.0/0"
}

# Generates a fresh SSH key pair and registers the public half with AWS.
# The private half is saved to your machine below — this is how Ansible
# and you will SSH into the box.
resource "tls_private_key" "jenkins" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "jenkins" {
  key_name   = "${var.cluster_name}-jenkins-key"
  public_key = tls_private_key.jenkins.public_key_openssh
}

resource "local_sensitive_file" "jenkins_private_key" {
  content         = tls_private_key.jenkins.private_key_pem
  filename        = "${path.module}/fernway-jenkins-key.pem"
  file_permission = "0600"
}

resource "aws_security_group" "jenkins" {
  name_prefix = "${var.cluster_name}-jenkins-"
  description = "Jenkins host - SSH + web UI"
  vpc_id      = module.vpc.vpc_id

  # Without this, changing anything about this security group forces
  # AWS to destroy it before creating the replacement — but it can't
  # destroy a security group still attached to a running instance's
  # network interface, causing a stuck deadlock. This flag builds the
  # replacement first, moves the instance over, then removes the old one.
  lifecycle {
    create_before_destroy = true
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  ingress {
    description = "Jenkins web UI"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.cluster_name}-jenkins-sg" }
}

# IAM role the EC2 instance assumes — lets Jenkins push images to ECR
# and (via the access entry below) run kubectl against the EKS cluster,
# without ever needing long-lived AWS keys stored on the box.
resource "aws_iam_role" "jenkins" {
  name = "${var.cluster_name}-jenkins-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "jenkins_ecr" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_instance_profile" "jenkins" {
  name = "${var.cluster_name}-jenkins-profile"
  role = aws_iam_role.jenkins.name
}

# Grants the Jenkins EC2 role permission to manage resources inside the
# "fernway" namespace only (not full cluster-admin) — least privilege:
# Jenkins can deploy your app, nothing else.
resource "aws_eks_access_entry" "jenkins" {
  cluster_name  = module.eks.cluster_name
  principal_arn = aws_iam_role.jenkins.arn
}

resource "aws_eks_access_policy_association" "jenkins" {
  cluster_name  = module.eks.cluster_name
  principal_arn = aws_iam_role.jenkins.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy"

  access_scope {
    type       = "namespace"
    namespaces = ["fernway"]
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  # The broader pattern "al2023-ami-*-x86_64" also matches AWS's
  # ECS-OPTIMIZED variant ("al2023-ami-ecs-hvm-..."), which auto-starts a
  # background ECS agent on every boot — wasted RAM/CPU on a small box
  # that isn't running ECS. This tighter pattern matches only the plain
  # AL2023 image.
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-*-x86_64"]
  }
}

resource "aws_instance" "jenkins" {
  ami                    = data.aws_ami.amazon_linux.id
  # Bumped from t3.micro (1GB) after it got overwhelmed running Jenkins +
  # Docker builds simultaneously — 2GB gives real headroom.
  instance_type          = "t3.small"
  subnet_id              = module.vpc.public_subnets[0]
  key_name               = aws_key_pair.jenkins.key_name
  vpc_security_group_ids = [aws_security_group.jenkins.id]
  iam_instance_profile   = aws_iam_instance_profile.jenkins.name

  root_block_device {
    volume_size = 30 # default 8GB fills up fast with Docker images
  }

  tags = { Name = "${var.cluster_name}-jenkins" }
}

# The VPC's public subnets don't auto-assign public IPs (map_public_ip_on_launch
# is false), so we attach a fixed Elastic IP instead — this also means the
# IP never changes even if the instance is stopped/started later.
resource "aws_eip" "jenkins" {
  instance = aws_instance.jenkins.id
  domain   = "vpc"

  tags = { Name = "${var.cluster_name}-jenkins-eip" }
}

output "jenkins_public_ip" {
  value = aws_eip.jenkins.public_ip
}

output "jenkins_ssh_key_path" {
  value = local_sensitive_file.jenkins_private_key.filename
}
