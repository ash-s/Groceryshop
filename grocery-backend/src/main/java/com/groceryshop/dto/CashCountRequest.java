package com.groceryshop.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class CashCountRequest {

    /** Day being counted; defaults to today when omitted. */
    private LocalDate date;

    private int n500;
    private int n200;
    private int n100;
    private int n50;
    private int n20;
    private int n10;
    private int n5;
    private int n2;
    private int n1;
}
