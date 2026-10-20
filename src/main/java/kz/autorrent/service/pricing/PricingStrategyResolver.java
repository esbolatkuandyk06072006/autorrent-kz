package kz.autorrent.service.pricing;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PricingStrategyResolver {

    private final List<PricingStrategy> strategies;

    public PricingStrategyResolver(List<PricingStrategy> strategies) {
        this.strategies = strategies;
    }

    public PricingStrategy resolve(long days) {
        return strategies.stream()
                .filter(strategy -> strategy.supports(days))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No pricing strategy for " + days + " days"));
    }
}
