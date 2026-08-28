package com.egyetemkapu;

import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class EgyetemkapuApplicationTests {

    @MockitoBean
    private RateLimitingService rateLimitingService;

    @Test
    void contextLoads() {
    }

}