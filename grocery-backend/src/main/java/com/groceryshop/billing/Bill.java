package com.groceryshop.billing;

import com.groceryshop.customer.Customer;
import com.groceryshop.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bills")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bill_number", nullable = false, unique = true, length = 20)
    private String billNumber;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @Column(name = "customer_name", length = 100)
    private String customerName;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    /** Discount (in rupees) applied to the whole bill at checkout. */
    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    /** Optional link to a remembered customer (for loyalty points). */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    /** Cash the customer handed over (change = cashGiven - total). */
    @Column(name = "cash_given", precision = 10, scale = 2)
    private BigDecimal cashGiven;

    /** Which notes the customer gave, e.g. "500x1,100x2". */
    @Column(name = "cash_notes", length = 255)
    private String cashNotes;

    /** Loyalty points spent on this bill. */
    @Column(name = "points_redeemed")
    private Integer pointsRedeemed;

    /** Loyalty points earned on this bill. */
    @Column(name = "points_earned")
    private Integer pointsEarned;

    /** Rupee value of the redeemed points (part of the total discount). */
    @Column(name = "points_discount", precision = 10, scale = 2)
    private BigDecimal pointsDiscount;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(length = 20)
    @Builder.Default
    private String shop = "GROCERY";

    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<BillItem> items = new ArrayList<>();

    public void addItem(BillItem item) {
        items.add(item);
        item.setBill(this);
    }
}
