package com.testmind.dto;

import com.testmind.model.TestRunStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestRunResponse {

    private Long id;
    private TestRunStatus status;
    private String triggeredBy;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Integer defectCount;
    private Double riskScore;
}
