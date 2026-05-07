function target = mission_manager(t)
% File Name: mission_manager.m
% Position: Root > modules > mission > mission_manager.m
% Description: Defines flight phases and waypoints.

    % Default
    target.pos   = [0; 0; 0];
    target.euler = [0; 0; 0];
    
    if t < 5.0
        target.pos   = [0; 0; -5.0];
        target.euler = deg2rad([0; 0; 0]);

    elseif t < 10.0
        target.pos   = [10; 0; -5.0];
        target.euler = deg2rad([0; 0; 0]);

    elseif t < 15.0
        target.pos   = [10; 10; -10.0];
        target.euler = deg2rad([0; 0; -90]);

    elseif t < 20.0
        target.pos   = [10; 10; -10.0];
        target.euler = deg2rad([20; 0; -90]);

    elseif t < 30.0
        target.pos   = [10; 10; -10.0];
        target.euler = deg2rad([0; 20; -90]);

    elseif t < 40.0
        target.pos   = [10; 10; -10.0];
        target.euler = deg2rad([30; 0; -70]);

    else
        target.pos   = [10; 10; -10.0];
        target.euler = deg2rad([0; 50; -45]);
    end
end