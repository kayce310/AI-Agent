function val_out = saturate(val_in, min_val, max_val)
% File Name: saturate.m
% Position: Root > utils > saturate.m
% Description: Clamps a value or vector between min and max limits.
    val_out = max(min_val, min(max_val, val_in));
end