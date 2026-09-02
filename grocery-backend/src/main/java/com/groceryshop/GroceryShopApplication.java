package com.groceryshop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GroceryShopApplication {

    public static void main(String[] args) {
        SpringApplication.run(GroceryShopApplication.class, args);
    }
}