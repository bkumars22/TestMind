package com.testmind.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "test_runs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TestRunStatus status;

    private String triggeredBy;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    @Builder.Default
    private Integer defectCount = 0;

    private Double riskScore;
}
