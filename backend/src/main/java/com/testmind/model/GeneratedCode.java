package com.testmind.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "generated_code")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratedCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_run_id", nullable = false)
    private PipelineRun pipelineRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_case_id")
    private GeneratedTestCase testCase;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CodeFramework framework;

    @Column(nullable = false, length = 30)
    private String language;

    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;

    @Column(name = "file_path", nullable = false, columnDefinition = "TEXT")
    private String filePath;

    @Column(name = "code_content", nullable = false, columnDefinition = "TEXT")
    private String codeContent;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
    }
}
