output "cluster_name" {
  value = module.eks.cluster_name
}

output "configure_kubectl" {
  description = "Run this to point kubectl at your new cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "ecr_backend_repo_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repo_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "rds_endpoint" {
  description = "Postgres host:port — used to build DATABASE_URL for the backend"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_database_name" {
  value = aws_db_instance.postgres.db_name
}
