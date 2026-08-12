# Uses the community-maintained VPC module (the standard choice — writing
# every subnet/route table/NAT gateway by hand is 300+ lines for no benefit).
# Registry: https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws

data "aws_availability_zones" "available" {
  state = "available"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnets  = ["10.0.0.0/24", "10.0.1.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]
  database_subnets = ["10.0.20.0/24", "10.0.21.0/24"]

  # One NAT gateway instead of one-per-AZ — cheaper for dev, less
  # resilient. Set to false for staging/prod to get one NAT per AZ.
  enable_nat_gateway = true
  single_nat_gateway = true

  create_database_subnet_group = true

  # These tags are how the AWS Load Balancer Controller and the EKS
  # cluster autoscaler discover which subnets to use — without them,
  # the ALB Ingress silently fails to find anywhere to place itself.
  public_subnet_tags = {
    "kubernetes.io/role/elb"                     = "1"
    "kubernetes.io/cluster/${var.cluster_name}"  = "shared"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"            = "1"
    "kubernetes.io/cluster/${var.cluster_name}"  = "shared"
  }
}
