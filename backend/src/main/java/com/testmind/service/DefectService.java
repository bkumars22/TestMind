package com.testmind.service;

import com.testmind.aop.Auditable;
import com.testmind.dto.DefectResponse;
import com.testmind.exception.ResourceNotFoundException;
import com.testmind.model.AuditLog;
import com.testmind.model.Defect;
import com.testmind.model.DefectStatus;
import com.testmind.model.User;
import com.testmind.repository.AuditLogRepository;
import com.testmind.repository.DefectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DefectService {

    private final DefectRepository defectRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public DefectResponse getById(Long id) {
        Defect defect = findById(id);
        return toResponse(defect);
    }

    @Auditable(action = "UPDATE_DEFECT_STATUS", entityType = "Defect")
    @Transactional
    public DefectResponse updateStatus(Long id, DefectStatus newStatus, User user) {
        Defect defect = findById(id);
        DefectStatus oldStatus = defect.getStatus();

        defect.setStatus(newStatus);
        defectRepository.save(defect);

        AuditLog log = AuditLog.builder()
                .userId(user.getId())
                .action("UPDATE_DEFECT_STATUS")
                .entityType("Defect")
                .entityId(id)
                .oldValue(oldStatus.name())
                .newValue(newStatus.name())
                .build();
        auditLogRepository.save(log);

        return toResponse(defect);
    }

    private Defect findById(Long id) {
        return defectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Defect", id));
    }

    private DefectResponse toResponse(Defect d) {
        return DefectResponse.builder()
                .id(d.getId())
                .testRunId(d.getTestRun().getId())
                .severity(d.getSeverity())
                .title(d.getTitle())
                .description(d.getDescription())
                .aiExplanation(d.getAiExplanation())
                .consistencyScore(d.getConsistencyScore())
                .jiraTicketId(d.getJiraTicketId())
                .status(d.getStatus())
                .createdAt(d.getCreatedAt())
                .build();
    }
}
