package com.testmind.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "story_analysis")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_run_id", nullable = false)
    private PipelineRun pipelineRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "jira_story_id", nullable = false, length = 100)
    private String jiraStoryId;

    @Column(name = "jira_summary", columnDefinition = "TEXT")
    private String jiraSummary;

    @Column(name = "business_rules", columnDefinition = "jsonb")
    private String businessRules;

    @Column(name = "acceptance_criteria", columnDefinition = "jsonb")
    private String acceptanceCriteria;

    @Column(name = "edge_cases", columnDefinition = "jsonb")
    private String edgeCases;

    @Column(name = "data_rules", columnDefinition = "jsonb")
    private String dataRules;

    @Column(name = "raw_story", columnDefinition = "jsonb")
    private String rawStory;

    @Column(name = "analyzed_at")
    private OffsetDateTime analyzedAt;

    @PrePersist
    protected void onCreate() {
        if (this.analyzedAt == null) {
            this.analyzedAt = OffsetDateTime.now();
        }
    }
}
