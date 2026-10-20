# Multi-stage build for the AutoRent KZ monorepo:
#   1) frontend stage builds the React SPA
#   2) backend stage packages Spring Boot with the SPA in static resources
#   3) runtime image serves the API and the SPA on port 8080

# ---------- Frontend ----------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY frontend ./
RUN npm run build

# ---------- Backend ----------
FROM maven:3.9.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /app/backend/src/main/resources/static ./src/main/resources/static
RUN mvn -q -DskipTests package

# ---------- Runtime ----------
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /app/backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
