function S = skew_symmetric(v)
% File Name: skew_symmetric.m
% Position: Root > utils > skew_symmetric.m
% Description: Returns the skew-symmetric matrix for cross product equivalent.
    S = [  0,    -v(3),  v(2);
           v(3),  0,    -v(1);
          -v(2),  v(1),  0   ];
end