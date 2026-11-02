package com.groceryshop.product;

import com.groceryshop.category.Category;
import com.groceryshop.supplier.Supplier;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    /** Internal short till code, e.g. "0001". Typed at the counter. */
    @Column(length = 50)
    private String code;

    /** Printed barcode on the packet. Matched by the scanner gun/mobile. */
    @Column(length = 50)
    private String barcode;

    @Column(length = 255)
    private String description;

    @Column(length = 100)
    private String brand;

    /** Rack / shelf location label, e.g. "A2" (optional). */
    @Column(length = 100)
    private String rack;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    /** Buying (cost) price per unit, used for profit reports (optional). */
    @Column(name = "cost_price", precision = 10, scale = 2)
    private BigDecimal costPrice;

    /** Expiry date of the current stock (optional). */
    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(nullable = false)
    @Builder.Default
    private Integer stock = 0;

    @Column(name = "min_stock", nullable = false)
    @Builder.Default
    private Integer minStock = 10;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(length = 20)
    @Builder.Default
    private String shop = "GROCERY";

    public boolean isLowStock() {
        return stock <= minStock;
    }
}
