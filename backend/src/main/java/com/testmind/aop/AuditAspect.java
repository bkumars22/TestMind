package com.testmind.aop;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmind.model.AuditLog;
import com.testmind.repository.AuditLogRepository;
import com.testmind.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditAspect {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Around("@annotation(auditable)")
    public Object auditMethod(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        String oldValue = captureArgs(joinPoint.getArgs());
        Object result = null;
        Throwable thrown = null;

        try {
            result = joinPoint.proceed();
            return result;
        } catch (Throwable t) {
            thrown = t;
            throw t;
        } finally {
            try {
                String newValue = (thrown == null) ? serializeObject(result) : "ERROR: " + thrown.getMessage();
                Long userId = resolveUserId();

                AuditLog auditLog = AuditLog.builder()
                        .userId(userId)
                        .action(auditable.action().isEmpty() ? joinPoint.getSignature().getName() : auditable.action())
                        .entityType(auditable.entityType().isEmpty() ? joinPoint.getTarget().getClass().getSimpleName() : auditable.entityType())
                        .oldValue(oldValue)
                        .newValue(newValue)
                        .build();

                auditLogRepository.save(auditLog);
            } catch (Exception e) {
                log.error("Failed to save audit log", e);
            }
        }
    }

    private String captureArgs(Object[] args) {
        if (args == null || args.length == 0) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(args);
        } catch (JsonProcessingException e) {
            return "[unserializable]";
        }
    }

    private String serializeObject(Object obj) {
        if (obj == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return obj.toString();
        }
    }

    private Long resolveUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails userDetails) {
            return null; // Email-only in UserDetails; service layer should pass userId explicitly when needed
        }
        return null;
    }
}
