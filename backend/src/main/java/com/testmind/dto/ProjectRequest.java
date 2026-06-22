package com.testmind.dto;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;
import lombok.Data;

@Data
public class ProjectRequest {

    @NotBlank(message = "Project name is required")
    private String name;

    @NotBlank(message = "Repository URL is required")
    @URL(message = "Must be a valid URL")
    private String repoUrl;

    @NotBlank(message = "GitHub token is required")
    private String githubToken;
}
