package com.testmind.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "gap_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GapReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_run_id", nullable = false)
    private PipelineRun pipelineRun;

    @Enumerated(EnumType.STRING)
    @Column(name = "gap_category", nullable = false, length = 50)
    private GapCategory gapCategory;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "priority_score", nullable = false, precision = 4, scale = 2)
    private BigDecimal priorityScore;

    @Column(name = "affected_requirement", columnDefinition = "TEXT")
    private String affectedRequirement;

    @Column(name = "existing_coverage", columnDefinition = "TEXT")
    private String existingCoverage;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
        if (this.priorityScore == null) {
            this.priorityScore = new BigDecimal("0.50");
        }
    }
}
