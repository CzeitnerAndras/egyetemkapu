package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.service.AiService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/ask")
    @LogAction("AI asszisztens használata")
    public Map<String, String> askAi(@RequestBody Map<String, String> request) {
        String userPrompt = request.get("prompt");
        String aiResponse = aiService.askAi(userPrompt);
        return Map.of("answer", aiResponse);
    }
}