package com.testmind.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "mcp_connections")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class McpConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private McpServerType serverType;

    @Column(columnDefinition = "TEXT")
    private String configJson;

    @Builder.Default
    private Boolean isActive = false;
}
