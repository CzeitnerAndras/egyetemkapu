package com.egyetemkapu;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EgyetemkapuApplication {

	public static void main(String[] args) {
		SpringApplication.run(EgyetemkapuApplication.class, args);
	}

}
