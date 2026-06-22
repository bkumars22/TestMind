package com.testmind.controller;

import com.testmind.dto.DefectResponse;
import com.testmind.dto.DefectStatusRequest;
import com.testmind.exception.ResourceNotFoundException;
import com.testmind.model.User;
import com.testmind.repository.UserRepository;
import com.testmind.service.DefectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/defects")
@RequiredArgsConstructor
@Tag(name = "Defects", description = "Defect management")
public class DefectController {

    private final DefectService defectService;
    private final UserRepository userRepository;

    @GetMapping("/{id}")
    @Operation(summary = "Get a defect by ID")
    public ResponseEntity<DefectResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(defectService.getById(id));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update the status of a defect")
    public ResponseEntity<DefectResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody DefectStatusRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getUsername()));
        return ResponseEntity.ok(defectService.updateStatus(id, request.getStatus(), user));
    }
}
