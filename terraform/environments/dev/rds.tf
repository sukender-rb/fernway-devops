# Only the EKS nodes can reach this database — not the public internet,
# not even your laptop. If you need to connect directly for debugging,
# use `kubectl port-forward` through a pod in the cluster, not a public
# security group rule.
resource "aws_security_group" "rds" {
  name_prefix = "${var.cluster_name}-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "Postgres from EKS nodes only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "postgres" {
  identifier     = "${var.cluster_name}-postgres"
  engine         = "postgres"
  engine_version = "16"

  # db.t3.micro is free-tier eligible — fine for dev, not for prod load.
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Dev: skip the final snapshot and disable deletion protection so
  # `terraform destroy` actually works cleanly. Flip both for staging/prod.
  skip_final_snapshot = true
  deletion_protection = false

  backup_retention_period = 7
  multi_az                = false # set true for staging/prod HA
}
