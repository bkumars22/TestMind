package com.testmind.dto;

import lombok.Data;

@Data
public class GeneratedCodeResponse {
    private Long id;
    private Long testCaseId;
    private String framework;
    private String language;
    private String fileName;
    private String filePath;
    private String codeContent;
}
