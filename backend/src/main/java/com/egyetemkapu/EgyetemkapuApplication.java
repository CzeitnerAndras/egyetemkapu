package com.egyetemkapu;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class EgyetemkapuApplication {

    public static void main(String[] args) {
        SpringApplication.run(EgyetemkapuApplication.class, args);
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}