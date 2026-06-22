# ---- Build stage ----
FROM maven:3.9-amazoncorretto-17 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

# ---- Runtime stage ----
FROM amazoncorretto:17-alpine AS runtime
WORKDIR /app
RUN addgroup -S testmind && adduser -S testmind -G testmind
COPY --from=builder /build/target/testmind-backend-1.0.0.jar app.jar
RUN chown testmind:testmind app.jar
USER testmind
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
