function [y_new, filter_state] = low_pass_filter(u_new, dt, cutoff_freq, filter_state)
% File Name: low_pass_filter.m
% Position: Root > utils > low_pass_filter.m
% Description: Discrete First Order Low Pass Filter.
    if cutoff_freq <= 0
        y_new = u_new;
        filter_state = y_new;
        return;
    end
    
    rc = 1.0 / (2 * pi * cutoff_freq);
    alpha = dt / (rc + dt);
    
    y_new = alpha * u_new + (1 - alpha) * filter_state;
    filter_state = y_new;
end