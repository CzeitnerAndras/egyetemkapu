package com.egyetemkapu.controller;

import com.egyetemkapu.dto.FlyerDetailDto;
import com.egyetemkapu.dto.FlyerSearchHitDto;
import com.egyetemkapu.dto.FlyerSummaryDto;
import com.egyetemkapu.service.FlyerPageProxyService;
import com.egyetemkapu.service.FlyerQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/flyers")
public class FlyerController {

    private final FlyerQueryService flyerQueryService;
    private final FlyerPageProxyService flyerPageProxyService;

    public FlyerController(FlyerQueryService flyerQueryService, FlyerPageProxyService flyerPageProxyService) {
        this.flyerQueryService = flyerQueryService;
        this.flyerPageProxyService = flyerPageProxyService;
    }

    @GetMapping
    public List<FlyerSummaryDto> list(@RequestParam(required = false) String store) {
        return flyerQueryService.list(store);
    }

    @GetMapping("/search")
    public List<FlyerSearchHitDto> search(@RequestParam(required = false) String q) {
        return flyerQueryService.search(q);
    }

    @GetMapping("/{id}")
    public FlyerDetailDto get(@PathVariable Long id) {
        return flyerQueryService.get(id);
    }

    @GetMapping("/{id}/pages/{pageNumber}")
    public ResponseEntity<byte[]> page(@PathVariable Long id, @PathVariable int pageNumber) {
        return flyerPageProxyService.pageImage(id, pageNumber);
    }
}
