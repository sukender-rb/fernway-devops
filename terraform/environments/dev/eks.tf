# Community EKS module — handles the control plane, IAM roles, OIDC
# provider (needed for IRSA below), and the node group in one place.
# Registry: https://registry.terraform.io/modules/terraform-aws-modules/eks/aws

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = var.cluster_name
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Lets you `kubectl` in directly for debugging. Turn this off (or
  # restrict to your office/VPN IP) once this is a real prod cluster.
  cluster_endpoint_public_access = true

  # Required so the ALB controller and other pods can assume IAM roles
  # via Kubernetes service accounts, instead of using long-lived keys.
  enable_irsa = true

  eks_managed_node_groups = {
    default = {
      instance_types = var.node_instance_types
      min_size       = 1
      max_size       = 4
      desired_size   = 2
      # This is what actually gives you "more users → more servers":
      # the Horizontal Pod Autoscaler scales pod replicas, and if the
      # existing nodes run out of room, the cluster autoscaler (added
      # later) scales this node group up automatically.
    }
  }

  tags = {
    Environment = var.environment
  }
}
