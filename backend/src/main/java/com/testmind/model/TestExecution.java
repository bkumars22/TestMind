package com.testmind.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "test_executions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_run_id", nullable = false)
    private PipelineRun pipelineRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_case_id", nullable = false)
    private GeneratedTestCase testCase;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ExecutionStatus status;

    @Column(name = "duration_ms")
    private Integer durationMs;

    @Column(name = "screenshot_url", columnDefinition = "TEXT")
    private String screenshotUrl;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "response_data", columnDefinition = "jsonb")
    private String responseData;

    @Column(name = "ai_explanation", columnDefinition = "TEXT")
    private String aiExplanation;

    @Column(name = "deepeval_score", precision = 4, scale = 3)
    private BigDecimal deepevalScore;

    @Column(name = "executed_at")
    private OffsetDateTime executedAt;

    @PrePersist
    protected void onCreate() {
        if (this.executedAt == null) {
            this.executedAt = OffsetDateTime.now();
        }
        if (this.status == null) {
            this.status = ExecutionStatus.PENDING;
        }
    }
}
