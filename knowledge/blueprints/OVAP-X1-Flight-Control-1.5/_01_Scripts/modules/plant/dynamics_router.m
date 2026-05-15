function [dx, F_b, M_b] = dynamics_router(kinematics_mode, t, x, act_phys, sys)
% File Name: dynamics_router.m

    if strcmp(kinematics_mode, 'quat')
        [dx, F_b, M_b] = dynamics_quat(t, x, act_phys, sys);
    elseif strcmp(kinematics_mode, 'dcm')
        [dx, F_b, M_b] = dynamics_dcm(t, x, act_phys, sys);
    else
        [dx, F_b, M_b] = dynamics_6dof(t, x, act_phys, sys);
    end
end