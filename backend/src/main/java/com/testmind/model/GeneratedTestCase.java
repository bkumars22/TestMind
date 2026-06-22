package com.testmind.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "generated_test_cases")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratedTestCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_run_id", nullable = false)
    private PipelineRun pipelineRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gap_report_id")
    private GapReport gapReport;

    @Column(nullable = false, length = 500)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_type", nullable = false, length = 50)
    private TestType testType;

    @Enumerated(EnumType.STRING)
    @Column(name = "gap_category", length = 50)
    private GapCategory gapCategory;

    @Column(columnDefinition = "TEXT")
    private String preconditions;

    @Column(name = "test_steps", nullable = false, columnDefinition = "jsonb")
    private String testSteps;

    @Column(name = "expected_result", nullable = false, columnDefinition = "TEXT")
    private String expectedResult;

    @Column(nullable = false, length = 20)
    private String priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TestCaseStatus status;

    @Column(name = "reviewer_notes", columnDefinition = "TEXT")
    private String reviewerNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
        if (this.status == null) {
            this.status = TestCaseStatus.PENDING;
        }
        if (this.priority == null) {
            this.priority = "MEDIUM";
        }
    }
}
