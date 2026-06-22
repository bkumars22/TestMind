package com.testmind.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "pipeline_runs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "jira_story_id", nullable = false, length = 100)
    private String jiraStoryId;

    @Column(name = "jira_summary", columnDefinition = "TEXT")
    private String jiraSummary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 60)
    private PipelineStatus status;

    @Column(name = "current_stage", nullable = false)
    private int currentStage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "report_url", columnDefinition = "TEXT")
    private String reportUrl;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @PrePersist
    protected void onCreate() {
        if (this.startedAt == null) {
            this.startedAt = OffsetDateTime.now();
        }
        if (this.status == null) {
            this.status = PipelineStatus.STAGE_1_INGESTING;
        }
        if (this.currentStage == 0) {
            this.currentStage = 1;
        }
    }
}
