package com.testmind.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {

    private Long id;
    private String name;
    private String repoUrl;
    private String techStack;
    private String status;
    private LocalDateTime createdAt;
    private Boolean activeTestRun;
}
