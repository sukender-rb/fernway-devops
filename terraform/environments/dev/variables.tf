variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name — dev, staging, or prod"
  type        = string
  default     = "dev"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "fernway-dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_name" {
  description = "Postgres database name"
  type        = string
  default     = "fernway"
}

variable "db_username" {
  description = "Postgres master username"
  type        = string
  default     = "fernway_user"
}

variable "db_password" {
  description = "Postgres master password — pass this via TF_VAR_db_password env var, never commit it"
  type        = string
  sensitive   = true
}

variable "node_instance_types" {
  description = "EC2 instance types for the EKS managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}
