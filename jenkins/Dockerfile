FROM jenkins/jenkins:lts-jdk17

USER root

# Docker CLI (talks to the host's Docker daemon via the mounted socket
# in docker-compose.yml — Jenkins itself doesn't run its own daemon)
RUN apt-get update && apt-get install -y \
      ca-certificates curl gnupg lsb-release unzip \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
      > /etc/apt/sources.list.d/docker.list \
    && apt-get update && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip -q awscliv2.zip && ./aws/install && rm -rf awscliv2.zip aws

# kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && rm kubectl

# Trivy (image vulnerability scanning)
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | \
    sh -s -- -b /usr/local/bin

# sonar-scanner CLI (source code quality scanning — runs directly here,
# not via docker socket, so it can resolve the "sonarqube" hostname on
# the compose network directly)
RUN curl -fLo sonar-scanner.zip https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip \
    && unzip -q sonar-scanner.zip -d /opt \
    && mv /opt/sonar-scanner-*-linux /opt/sonar-scanner \
    && rm sonar-scanner.zip
ENV PATH="/opt/sonar-scanner/bin:${PATH}"

# Let the jenkins user run docker commands against the mounted socket
RUN groupadd -f docker && usermod -aG docker jenkins

USER jenkins

# Skip the setup wizard for a smoother first run — you'll still create
# your own admin user via JENKINS_ADMIN_ID/PASSWORD in docker-compose.
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
