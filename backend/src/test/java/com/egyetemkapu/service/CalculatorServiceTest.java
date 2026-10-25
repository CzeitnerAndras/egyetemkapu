package com.egyetemkapu.service;

import io.github.bucket4j.Bucket;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Field;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class CalculatorServiceTest {

    private static final String NEWTON = "https://newton.vercel.app/api/v2/simplify/x";

    private final RateLimitingService rateLimitingService = mock(RateLimitingService.class);
    private final Bucket bucket = mock(Bucket.class);
    private final CalculatorService service = new CalculatorService(rateLimitingService);

    @Test
    void calculateComplex_refusesWhenTheRateLimitIsSpent() {
        when(rateLimitingService.resolveBucket("math_anna")).thenReturn(bucket);
        when(bucket.tryConsume(1)).thenReturn(false);

        Map<String, Object> result = service.calculateComplex("simplify", "x", "anna");

        assertEquals("Túl sok számítási kérés! Kérlek, várj egy percet a következőig.", result.get("error"));
    }

    @Test
    void calculateComplex_returnsTheNewtonPayload() throws Exception {
        when(rateLimitingService.resolveBucket("math_anna")).thenReturn(bucket);
        when(bucket.tryConsume(1)).thenReturn(true);
        MockRestServiceServer server = stubNewton();
        server.expect(requestTo(NEWTON))
                .andRespond(withSuccess("{\"result\":\"x\"}", MediaType.APPLICATION_JSON));

        Map<String, Object> result = service.calculateComplex("simplify", "x", "anna");

        assertEquals("x", result.get("result"));
        server.verify();
    }

    @Test
    void calculateComplex_reportsAFailedNewtonCall() throws Exception {
        when(rateLimitingService.resolveBucket("math_anna")).thenReturn(bucket);
        when(bucket.tryConsume(1)).thenReturn(true);
        MockRestServiceServer server = stubNewton();
        server.expect(requestTo(NEWTON)).andRespond(withServerError());

        Map<String, Object> result = service.calculateComplex("simplify", "x", "anna");

        assertEquals("Hiba a külső matematikai API hívásakor.", result.get("error"));
        server.verify();
    }

    private MockRestServiceServer stubNewton() throws Exception {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        Field field = CalculatorService.class.getDeclaredField("restTemplate");
        field.setAccessible(true);
        field.set(service, restTemplate);
        return server;
    }
}
