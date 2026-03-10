package com.maxro.maxro_backend.model;

import java.time.Instant;

public class WaterEntry {

    private double amountOz;
    private Instant loggedAt;

    public WaterEntry() {
        this.loggedAt = Instant.now();
    }

    public WaterEntry(double amountOz) {
        this.amountOz = amountOz;
        this.loggedAt = Instant.now();
    }

    public double getAmountOz() { return amountOz; }
    public void setAmountOz(double amountOz) { this.amountOz = amountOz; }

    public Instant getLoggedAt() { return loggedAt; }
    public void setLoggedAt(Instant loggedAt) { this.loggedAt = loggedAt; }
}
