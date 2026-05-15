---
source: knowledge/blueprints/Introduction to aircraft flight mechanics (1).pdf
type: pdf
converted: 2026-05-13T02:58:44.704Z
---

# Introduction_to_aircraft_flight_mechanics__1_



-- 1 of 650 --

Introduction to Aircraft Flight Mechanics:
Performance, Static Stability, Dynamic
Stability, and Classical Feedback Control

-- 2 of 650 --

This page intentionally left blank

-- 3 of 650 --

Introduction to Aircraft Flight Mechanics:
Performance, Static Stability, Dynamic
Stability, and Classical Feedback Control
Thomas R. Yechout
with
Steven L. Morris
David E. Bossert
Wayne F. Hallgren
EDUCATION SERIES
Joseph A. Schetz
Series Editor-in-Chief
Virginia Polytechnic Institute and State University
Blacksburg, Virginia
Published by
American Institute of Aeronautics and Astronautics, Inc.
1801 Alexander Bell Drive, Reston, VA 20191-4344

-- 4 of 650 --

American Institute of Aeronautics and Astronautics, Inc., Reston, Virginia
1 2 3 4 5
Library of Congress Cataloging-in-Publication Data
[CIP Data to come]
Copyright # 2003 by the American Institute of Aeronautics and Astronautics, Inc. This
work was created in the performance of a Cooperative Research and Development
Agreement with the Department of the Air Force. The Government of the United States
has certain rights to use this work.
Data and information appearing in this book are for informational purposes only. AIAA is
not responsible for any injury or damage resulting from use or reliance, nor does AIAA
warrant that use or reliance will be free from privately owned rights.

-- 5 of 650 --

AIAA Education Series
Editor-in-Chief
Joseph A. Schetz
Virginia Polytechnic Institute and State University
Editorial Board
Daniel J. Biezad
California Polytechnic State
University
Aaron R. Byerley
U.S. Air Force Academy
Kajal K. Gupta
NASA Dryden Flight Research
Center
John K. Harvey
Imperial College
David K. Holger
Iowa State University
Rakesk K. Kapania
Virginia Polytechnic Institute and
State University
Brian Landrum
University of Alabama,
Huntsville
Robert G. Loewy
Georgia Institute of Technology
Michael Mohaghegh
The Boeing Company
Dora Musielak
Northrop Grumman Corporation
Conrad F. Newberry
Naval Postgraduate School
David K. Schmidt
University of Colorado,
Colorado Springs
Peter Turchi
Los Alamos National Laboratory
David M. Van Wie
Johns Hopkins University

-- 6 of 650 --

This page intentionally left blank

-- 7 of 650 --

Foreword
Introduction 	to 	Aircraft 	Flight 	Mechanics: 	Performance, 	Static 	Stability,
Dynamic Stability, and Classical Feedback Control by Thomas R. Yechout
with Steven L. Morris, David E. Bossert, and Wayne F. Hallgren as contribu-
tors, all from the Department of Aeronautics of the U.S. Air Force Academy, is
an outstanding textbook for use in undergraduate aeronautical engineering
curricula. The text evolved from lecture notes at the Academy and it incorpo-
rates many suggestions literally from hundreds of cadets to improve its peda-
gogical value. The text reflects a wealth of experience by the authors. It covers
all the essential topics needed to teach performance, static and dynamic
stability, and classical feedback control of the aircraft at the introductory level.
The ten chapters of this text cover the following topics: (1) Review of Basic
Aerodynamics, (2) Review of Basic Propulsion, (3) Aircraft Performance, (4)
Aircraft Equations of Motion, (5) Aircraft Static Stability, (6) Linearizing
Equations of Motion, (7) Aircraft Dynamic Stability, (8) Classical Feedback
Control, (9) Aircraft Stability and Control Augmentation, and (10) Special
Topics (mainly additional analysis techniques for feedback control and the
various types of aircraft flight control systems). This text should contribute
greatly to the learning of the fundamental principles of flight mechanics that is
the crucial requirement in any aeronautical engineering curricula.
The AIAA Education Series of textbooks and monographs, inaugurated in
1984, embraces a broad spectrum of theory and application of different disci-
plines in aeronautics and astronautics, including aerospace design practice. The
series also includes texts on defense science, engineering, and management.
These texts serve as teaching tools as well as reference materials for practicing
engineers, scientists, and managers. The complete list of textbooks published
in the series can be found on the end pages of this volume.
J. S. PRZEMIENIECKI
Editor-in-Chief (Retired)
AIAA Education Series
vii

-- 8 of 650 --

This page intentionally left blank

-- 9 of 650 --

Table of
Contents
Preface . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	xiii
Acknowledgments . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	xv
Chapter 1 	A Review of Basic Aerodynamics . . . . . . . . . . . . . . . . . 	1
1.1 	Fundamental Concepts and Relationships . . . . . . . . . . . . . . . . 	1
1.2 	The Standard Atmosphere . . . . . . . . . . . . . . . . . . . . . . . . . . 	13
1.3 	Airfoil Fundamentals . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	15
1.4 	Finite Wings . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	42
1.5 	Aircraft Aerodynamics . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	47
1.6 	Historical Snapshot—The AC-130H Drag Reduction
Effort . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	53
References . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	55
Problems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	56
Chapter 2 	A Review of Basic Propulsion . . . . . . . . . . . . . . . . . . . 	59
2.1 	Types of Propulsion Systems . . . . . . . . . . . . . . . . . . . . . . . . 	59
2.2 	Propulsion System Characteristics . . . . . . . . . . . . . . . . . . . . . 	64
2.3 	Historical Snapshot—Aircraft Performance Modeling and
the Learjet Model 35 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	76
Reference . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	78
Problems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	78
Chapter 3 	Aircraft Performance . . . . . . . . . . . . . . . . . . . . . . . . . 	81
3.1 	Airspeed . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	81
3.2 	Equations of Motion for Straight, Level, and Unaccelerated
Flight . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	85
3.3 	Thrust and Power Curves . . . . . . . . . . . . . . . . . . . . . . . . . . 	87
3.4 	Takeoff and Landing Performance . . . . . . . . . . . . . . . . . . . . 	91
3.5 	Gliding Fight . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	102
3.6 	Climbs . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	108
3.7 	Endurance . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	110
3.8 	Range . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	116
3.9 	Turn Performance and V-n Diagrams. . . . . . . . . . . . . . . . . . . 	127
3.10 	Historical Snapshot . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	135
References . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	140
Problems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	140
ix

-- 10 of 650 --

Chapter 4 	Aircraft Equations of Motion . . . . . . . . . . . . . . . . . . . 	145
4.1 	Aircraft Axis Systems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	145
4.2 	Coordinate Transformations . . . . . . . . . . . . . . . . . . . . . . . . . 	147
4.3 	Aircraft Force Equations . . . . . . . . . . . . . . . . . . . . . . . . . . . 	153
4.4 	Moment Equations . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	155
4.5 	Longitudinal and Lateral-Directional Equations of Motion . . . . . 	164
4.6 	Kinematic Equations . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	164
4.7 	Historical Snapshot—Genesis 2000 Flight Simulator. . . . . . . . . 	169
Reference . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	170
Problems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	170
Chapter 5 	Aircraft Static Stability . . . . . . . . . . . . . . . . . . . . . . . . 	173
5.1 	Static Stability Overview . . . . . . . . . . . . . . . . . . . . . . . . . . . 	173
5.2 	Stability, Control Power, and Cross-Control Derivatives,
and Control Deflection Sign Convention . . . . . . . . . . . . . . . . . 	174
5.3 	Longitudinal Applied Forces and Moments . . . . . . . . . . . . . . . 	177
5.4 	Longitudinal Static Stability . . . . . . . . . . . . . . . . . . . . . . . . . 	191
5.5 	Lateral-Directional Applied Forces and Moments . . . . . . . . . . . 	202
5.6 	Lateral-Directional Static Stability . . . . . . . . . . . . . . . . . . . . . 	215
5.7 	Summary of Steady-State Force and Moment Derivatives . . . . . 	229
5.8 	Historical Snapshot—The X-38 Mid-Rudder Investigation . . . . . 	230
References . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	233
Problems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	233
Chapter 6 	Linearizing the Equations of Motion . . . . . . . . . . . . . . 	239
6.1 	Small Perturbation Approach . . . . . . . . . . . . . . . . . . . . . . . . 	239
6.2 	Developing the Linearized Aircraft Equations of Motion . . . . . . 	241
6.3 	First-Order Approximation of Applied Aero Forces and
Moments . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	244
6.4 	First-Order Approximation of Perturbed Thrust Forces and
Moments . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	279
6.5 	Recasting the Equations of Motion in Acceleration
Format . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	285
6.6 	Historical Snapshot—The X-38 Parafoil Cavity
Investigation. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	291
References . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	296
Problems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	296
Chapter 7 	Aircraft Dynamic Stability . . . . . . . . . . . . . . . . . . . . . 	303
7.1 	Mass-Spring-Damper System and Classical Solutions of
Ordinary Differential Equations . . . . . . . . . . . . . . . . . . . . . . . 	303
7.2 	Root Representation Using the Complex Plane . . . . . . . . . . . . 	316
7.3 	Transforming the Linearized EOM to the Laplace
Domain . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	321
x 	TABLE OF CONTENTS

-- 11 of 650 --

7.4 	Dyanmic Stability Guidelines . . . . . . . . . . . . . . . . . . . . . . . . 	356
7.5 	Cooper–Harper Ratings . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	371
7.6 	Experimental Determination of Second-Order Parameters . . . . . 	372
7.7 	Historical Snapshot—The A-10A Prototype Flight
Evaluation . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	377
References . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	380
Problems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	380
Chapter 8 	Classical Feedback Control . . . . . . . . . . . . . . . . . . . . . 	389
8.1 	Open-Loop Systems, Transfer Functions, and Block Diagrams . . 	389
8.2 	Closed-Loop Systems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	392
8.3 	Closed-Loop Analysis of a Second-Order System. . . . . . . . . . . 	394
8.4 	Closed-Loop Transfer Functions . . . . . . . . . . . . . . . . . . . . . . 	399
8.5 	Time Response Characteristics . . . . . . . . . . . . . . . . . . . . . . . 	403
8.6 	Root Locus Analysis . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	405
8.7 	Historical Snapshot—The C-1 Autopilot . . . . . . . . . . . . . . . . . 	427
Problems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	428
Chapter 9 	Aircraft Stability and Control Augmentation. . . . . . . . . 	433
9.1 	Inner-Loop Stability and Control . . . . . . . . . . . . . . . . . . . . . . 	433
9.2 	Outer-Loop Autopilot=Navigation Control . . . . . . . . . . . . . . . . 	444
9.3 	Compensation Filters . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	451
9.4 	Combined Systems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	457
9.5 	Historical Snapshot—The A-7D DIGITAC Digital
Multimode Flight Control System Program . . . . . . . . . . . . . . . 	463
References . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	469
Problems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	469
Chapter 10 	Special Topics. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	473
10.1 	System Type and Steady-State Error . . . . . . . . . . . . . . . . . . . 	473
10.2 	Frequency Response . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	492
10.3 	Digital Control . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	544
10.4 	Advanced Control Algorithms . . . . . . . . . . . . . . . . . . . . . . . 	549
10.5 	Reversible and Irreversible Flight Control Systems . . . . . . . . . 	551
10.6 	Spins. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	554
10.7 	Historical Snapshot—The F-16 Fly-by-Wire System . . . . . . . . 	558
Problems . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	567
Appendix A 	Conversions. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	571
Appendix B 	Properties of the U.S. Standard Atmosphere. . . . . . . . 	573
Appendix C 	Airfoil Data. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	577
Appendix D 	T-38 Performance Data . . . . . . . . . . . . . . . . . . . . . . 	589
TABLE OF CONTENTS 	xi

-- 12 of 650 --

Appendix E 	Selected Laplace Transforms. . . . . . . . . . . . . . . . . . . 	603
Appendix F 	Cramer’s Rule . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	605
Appendix G 	Development of Longitudinal and Lateral-Directional
Transfer Functions . . . . . . . . . . . . . . . . . . . . . . . . . 	609
Appendix H 	Stability Characteristics of Selected Aircraft . . . . . . . 	613
Bibliography . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	623
Index . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	625
Series listing . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 	631
xii 	TABLE OF CONTENTS

-- 13 of 650 --

Preface
This textbook was created as a resource for teaching aircraft performance,
static stability, dynamic stability, and classical feedback control as part of an
undergraduate aeronautical engineering curriculum. Chapters 1 through 5 are
intended for a one-semester course in performance and static stability, while
Chapters 6 through 9 are intended for a sequential one-semester course in
dynamic stability and feedback control. The text is intended to provide an
understandable first exposure to these topics as well as a logical progression of
subject matter. These courses are normally taken during the junior year follow-
ing a fundamental course in aeronautics. This text in draft form was used as
the course text for the first two courses in aircraft flight mechanics at the U.S.
Air Force Academy during a four-year period preceding publication. The
experience and student feedback obtained was used to improve and expand the
text. The text was also used at the Air Force Academy for an undergraduate
aeronautical engineering elective course in aircraft feedback control systems,
normally taken after completion of the aircraft dynamic stability and feedback
control course. Chapters 6 through 9 were covered at a fairly rapid pace and
Chapter 10 provided new material and additional depth. This text may also
serve as a reference for the practicing engineer.
Thomas R. Yechout
January 2003
xiii

-- 14 of 650 --

This page intentionally left blank

-- 15 of 650 --

Acknowledgments
Many individuals contributed to the development of this textbook. First, I
would like to thank Col. Michael L. Smith and Col. D. Neal Barlow, the past
and present heads of the Department of Aeronautics at the U. S. Air Force
Academy, for their encouragement and support throughout the five years
required to bring this effort from concept to reality. Special thanks are due to
Lt. Col. (Ret.) Steven L. Morris for his contributions to Chapters 2 and 4 and
for his many years of contributing to the development of flight mechanics
courses at the Air Force Academy. Thanks also to Col. (Ret.) Wayne F. Hallg-
ren for his contributions to Chapters 1 and 3 and to Lt. Col. David E. Bossert
for his contributions to Chapter 10. Excellent contributions and review were
provided by Bill Blake and Dave Leggett of the Air Force Research Labora-
tory, Flight Vehicles Directorate, Dr. Jeff Ashworth of Embry Riddle Aeronau-
tical University, Dr. Dennis Bernstein of the University of Michigan, and
Meredith Cawley of the AIAA staff. Thanks are also due to Lt. Col. Dave
Bossert, Lt. Col. Steve Pluntze, Col. (Ret.) Gene Rose, Capt. Alex Sansone,
Lt. Col. Scott Wells, and Dr. Tom Cunningham, all of the Air Force Academy
Department of Aeronautics, for the time devoted to providing detailed review
comments. In addition, AIAA reviewers and numerous Air Force Academy
cadets majoring in aeronautical engineering provided review comments. Finally,
I would like to thank my wife, Kathy, for her continued support throughout the
development of this textbook and the career that I love.
Thomas R. Yechout
xv

-- 16 of 650 --

1
A Review of Basic Aerodynamics
Lift, drag, thrust, and weight are the four primary forces acting on an
aircraft in flight (refer to Fig. 1.1).
Lift and drag are ‘‘aerodynamic forces’’ arising because of the relative
motion between the aircraft and the surrounding air. Thrust is provided by the
propulsive system, and the force due to gravity is called ‘‘weight.’’
Ultimately, we want to adequately predict an aircraft’s motion. An under-
standing of lift, drag, and thrust is essential to this end. This chapter provides
the basics of lift and drag, while Chapter 2 introduces propulsion. These chap-
ters are not designed to replace an aerodynamics or propulsion course, but do
provide a baseline we can build on.
1.1 	Fundamental Concepts and Relationships
We will begin our discussion with a review of fundamental aerodynamic
concepts and relationships. A sound understanding of these concepts is neces-
sary to establish a solid foundation for the study of aircraft flight mechanics.
1.1.1 	Properties of a Flowfield and a Discussion of Units
The study of aerodynamics deals with the flow of air. As a body moves
through air, or any fluid (liquid or gas) for that matter, the surrounding air is
disturbed. The term ‘‘flowfield’’ is common in the language of aerodynamics
and is used to refer to the air in the vicinity of the body.
Pressure, density, temperature, and velocity are the key physical properties
of aerodynamics. A goal of the aeronautical engineer is to quantify these prop-
erties at every point in the flowfield. We will begin by defining each of these
properties:
1) Pressure ( p) ‘‘is the normal force per unit area exerted on a surface due to
the time rate of change of momentum of the gas molecules impacting the
surface’’ (Ref. 1). At sea level, atmospheric pressure is approximately
2116 psf. Pressure distributions on an aircraft, caused by the same physical
mechanism (namely an exchange of momentum between air molecules and
a body) will be discussed elsewhere in this book.
2) The density ( r) of air is its mass (weight=acceleration due to gravity) per
unit volume. A high-density flow implies closely compacted air molecules.
3) Temperature (T ) is a measure of the average kinetic energy of the air
molecules. A high temperature indicates that the air molecules are moving
randomly at relatively high speeds.
1

-- 17 of 650 --

4) Velocity (V ) is a vector quantity; it has both magnitude and direction. The
velocity at any point in the flowfield is the velocity of an infinitesimally
small fluid element (differential ‘‘chunk’’ of air) as it sweeps through that
point.
The English Engineering System is used in this text. Based on a consistent
set of units (from Newton’s 2nd law), this system is typically chosen in the
study of flight mechanics. Assuming constant mass, Newton’s 2nd law is:
F ¼ ma
A pound force (lb) is defined as the force necessary to accelerate one slug (our
unit of mass) one foot, per second squared. Table 1.1 displays the dimensions
and units used for our fundamental properties.
Consider a flowfield as shown in Fig. 1.2. Our four properties are called
‘‘point properties.’’ In general, they vary from point to point within the flow-
field. Additionally, these properties can be a function of time; this is called
‘‘unsteady’’ flow. Pressure can be a function of not only location, but also of
time, for example p ¼ pðx; y; z; tÞ.
A ‘‘steady flow’’ assumption removes the time dependency; therefore,
p ¼ pðx; y; zÞ. Obviously, this makes our analysis more simple. For the case of
Table 1.1 	Dimensions and units used in this book
PROPERTY 	DIMENSIONS 	UNITS
Pressure ( p) 	force=area 	lb=ft2 (psf)
Density (r) 	mass=volume 	slug=ft3
Temperature (T ) 	n=a 	deg Rankine (R)
Velocity (V ) 	length=time 	ft=s (fps)
Fig. 1.1 	Simplified illustration of the four forces acting on an aircraft.
2 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 18 of 650 --

straight, level, and unaccelerated flight, steady flow is a reasonable assumption.
It would be unreasonable to assume steady flow for a rapid pitch-up maneuver.
Another important concept, which relates to velocity, is the definition of a
‘‘streamline.’’ A streamline is a curve that is tangent to the velocity vectors in
a flow. For example, refer to Fig. 1.3.
Consider two arbitrary streamlines in the flow, as shown in Fig. 1.4. A
consequence of the definition of a streamline in steady flow is that the mass
flow (slug=s) passing through cross section 1 must be the same as that passing
through 2. By definition, there is no mechanism for mass to cross a stream-
line—the mass flow rate must be conserved between the two streamlines.
Shortly, the significance of this will become more clear.
For flow over an airfoil, the distance between streamlines is decreased as
they pass over and above the airfoil. As we will see, this indicates an increase
in velocity.
Fig. 1.2 	Point in a flowfield.
Fig. 1.4 	Two streamlines in a flowfield.
Fig. 1.3 	Streamline in a flowfield.
A REVIEW OF BASIC AERODYNAMICS 	3

-- 19 of 650 --

1.1.2 	Equation of State for a Perfect Gas
A perfect gas assumes that intermolecular forces are negligible. For the
pressures and densities characteristic of flight mechanics applications, this
assumption is extremely reasonable. The equation governing a perfect gas is:
p ¼ rRT
where R is the specific gas constant, a function of the gas considered. For
example, its value for air is different than for argon. For normal air (not, for
example, chemically reacting air) the value of R is:
R ¼ 1716 ft-lb
ðslugÞðRÞ ½English Units ¼ 287 J
ðkgÞðKÞ ½Metric Units
Looking at the units of R, temperature must be in degrees Rankine [English
Units] or Kelvin [Metric Units] to properly use the equation of state.
Example 1.1
An aircraft is flying at an air pressure of 10 psi and a temperature of
20F. What is the air density for these conditions?
Using the equation of state and solving for density, we have:
r ¼ p
RT
We must next convert to consistent units.
p ¼ 10 psi ¼ ð10 psiÞð144 psf =psiÞ ¼ 1440 psf
T ¼ 20F ¼ 460 þ ð20 Þ ¼ 440R
Finally,
r ¼ 1440
ð1716Þð440Þ ¼ 0:00191slug=ft 3
1.1.3 	Hydrostatic Equation
Consider a differential fluid element of air shown in Fig. 1.5. Its mass is dm,
and it has dimensions as shown below. In the vertical direction there are two
forces—weight and the forces due to pressure acting on the top and bottom
surface areas (dA).
Consider a force balance in the vertical, or z, direction,
SFz ¼ pdA  ð p þ dpÞdA  ðrdAdhÞg
4 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 20 of 650 --

or
dp ¼ rgdh
Called the hydrostatic equation because it was originally derived for water, this
differential equation relates a change in h, or altitude, with a change in pres-
sure. Note, a positive increase in altitude corresponds to a negative change in
pressure. As altitude increases, pressure decreases. Integrating between heights
1 and 2 in the vertical direction yields
ð2
1
dp ¼ 
ð2
1
rgdh
Assuming constant r and g,
p2  p1 ¼ rgðh2  h1Þ 	ð1:1Þ
This relationship is known as the manometry equation and is valid for a fluid
(typically a liquid) of constant density in a uniform gravitational field.
Example 1.2
A lake is 50 ft deep. What is the difference in pressure between the bottom
of the lake and the surface given that the density of water is 1.94 slug=ft 3 ?
Using the manometry equation [Eq. (1.1)], we have
p2  p1 ¼ rgðh2  h1Þ
We will designate position 1 as the surface of the water (h1 ¼ 0) and position
2 as the bottom of the lake (h2 ¼ 50 ft). We then have
p2  p1 ¼ ð1:94Þð32:2Þð50  0Þ ¼ 3123:4 psf
Fig. 1.5 	Differential fluid element of air.
A REVIEW OF BASIC AERODYNAMICS 	5

-- 21 of 650 --

Thus, the pressure at the bottom of the lake is 3123.4 psf higher than at the
surface.
1.1.4 	Continuity Equation
The laws of aerodynamics are governed by physical principles. When these
principles are applied to an appropriate model, useful equations can be derived.
The continuity equation is based on the physical law that mass is conserved.
Consider the ‘‘stream tube’’ in Fig. 1.6, which can be thought of as a bundle
of streamlines. Let us also recall that mass cannot cross a streamline.
If we assume a steady flow, such that the properties everywhere in the flow-
field are time independent, then the mass flow rate across 1 and 2 must be the
same. Now, we will define a one-dimensional flow, which is a flow in which
the properties are assumed constant at each cross section (perpendicular to the
flow’s velocity) of the flow. To help your understanding, consider Fig. 1.7 in
which 1 and 2 are arbitrary points on a cross section of the flow.
By assuming one-dimensional flow, we neglect any variation in the velocity
across a specific cross section. The amount of incremental mass, dm, that
enters the stream tube during the incremental time, dt, can be defined as
dm ¼ rAdx ¼ rAV dt
where A is the cross-sectional area of the stream tube. The following expres-
sion then follows for the mass flow rate through the stream tube:
dm
dt ¼ _m	m ¼ rAV
Fig. 1.6 	Three-dimensional stream tube.
Fig. 1.7 	Illustration of one-dimensional flow.
6 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 22 of 650 --

Because mass is conserved, the mass flow rate is the same at any cross section
in the stream tube and the continuity equation reduces to the following simple
result:
r1A1V1 ¼ r2A2V2 	ð1:2Þ
or, rAV ¼ constant.
The dimensions are mass per time. It should make sense that the mass flow
rate is a function of density, velocity, and cross-sectional area.
Example 1.3
Consider the following nozzle.
Find the velocity V2 at the nozzle exit given that
V1 ¼ 35 ft=s 	r1 ¼ 0:002 slug=ft3 	A1 ¼ 0:5 ft 2
r2 ¼ 0:0015 slug=ft3 	A2 ¼ 0:05 ft 2
Using the continuity equation [Eq. (1.2)] and solving for V2 ,
V2 ¼ r1A1V1
r2A2
¼ ð0:002Þð0:5Þð35Þ
ð0:0015Þð0:05Þ ¼ 466:7 ft=s
1.1.5 	Incompressible and Compressible Flow
Under certain conditions, it is reasonable to assume the flowfield is essen-
tially incompressible, or constant density flow. This assumption is typically
made for low-speed flowfields, where velocities everywhere (all x; y; z loca-
tions) are less than 330 ft=s. Later we will define Mach number (M ) and note
that this threshold corresponds to a Mach number of 0.3 at sea-level, standard-
day conditions.
Note that the continuity equation reduces to the following for the case of a
one-dimensional, steady, and incompressible flow. The dimensions have, of
course, changed—they are now ft 3=s, or volumetric flow rate.
AV ¼ Constant
A REVIEW OF BASIC AERODYNAMICS 	7

-- 23 of 650 --

As an aside, water (another fluid) is virtually incompressible. For this reason,
flowfield density variations are typically ignored for water and other liquids.
Example 1.4
For the nozzle of Example 1.3, assume the fluid is incompressible water and
V1 remains at 35 ft=s. Find V2 and the volumetric flow rate.
Using the incompressible form of the continuity equation and solving for
V2 , we have
V2 ¼ V1A1
A2
¼ ð35Þð0:5Þ
0:05 ¼ 350 ft=s
The volumetric flow rate would be,
volumetric flow rate ¼ V1A1 ¼ V2A2 ¼ ð35Þð0:5Þ ¼ 17:5 ft 3=s
1.1.6 	Bernoulli’s Equation
Newton’s 2nd law is used again (refer to the hydrostatic equation) to derive
another extremely useful equation. Consider a differential fluid element moving
along a streamline, as shown in Fig. 1.8.
In general, the forces acting on the fluid element are (refer to Fig. 1.9)
1) Weight, or force due to gravity
2) Normal forces (pressure times surface area) acting on all six sides
3) Tangential forces due to the friction between adjacent fluid elements
For the purpose of this discussion, only the forces in the streamline direc-
tion are shown. In fact, forces due to pressure and friction act on all six
surfaces.
Assume a steady flow and neglect the weight of the fluid element—in
essence, we are assuming the fluid element’s weight is small (for air) in
comparison to the pressure forces ‘‘pushing’’ the element along the streamline.
Furthermore, neglect the effects of friction. By applying Newton’s 2nd law,
Fig. 1.8 	Differential fluid element moving along a streamline.
8 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 24 of 650 --

F ¼ ma reduces to the following differential equation (for details, refer to Ref.
2), called Euler’s equation:
dp ¼ rV dV
Euler’s equation is not convenient for easily solving problems. If we make one
more assumption, incompressible flow, density is assumed constant, and the
equation is easily integrated between two points along a streamline.
ð2
1
dp ¼ 
ð2
1
rV dV
p2  p1 ¼ r V 2
2
2  V 2
1
2
 	
p1 þ 1
2 rV 2
1 ¼ p2 þ 1
2 rV 2
2 	ð1:3Þ
or
p þ 1
2rV 2 ¼ constant ðalong a streamlineÞ
static pressure 	dynamic pressure ðqqÞ
As long as the assumptions are valid, the summation of static pressure ( p)
and dynamic pressure (qq ¼ 1
2 rV 2 ) remains constant along the streamline.
Frequently, ‘‘total pressure’’ ( p0 ) is used to identify the constant, or
p0 ¼ p þ qq ¼ total pressure
Equation (1.3) is called Bernoulli’s equation or the momentum equation and is
one of the classics of aerodynamics. The equation is algebraic. Remember, this
only applies for incompressible flow. Additionally, the four assumptions behind
Euler’s equation are still buried in the result—the equation is applied along a
streamline, steady flow is assumed, and forces due to weight and friction are
neglected.
Fig. 1.9 	Forces acting on a fluid element.


A REVIEW OF BASIC AERODYNAMICS 	9

-- 25 of 650 --

Let’s pause for a moment. Note that both the continuity and the momentum
equations relate properties (pressure, density, and velocity) between points in a
flow, say A and B. On the other hand, the equation of state can only be applied
at a single point; it says nothing about how the properties at point B relate to
the properties at point A.
Example 1.5
An F-15 on approach to Tyndall Air Force Base is flying at 120 kn. The
atmospheric pressure and density are 2116 psf and 0.00238 slug=ft 3 , respec-
tively. At a point on the upper surface of the wing, the pressure is measured as
2060 psf. Find the velocity of the flow at this point on the wing and the total
pressure acting on the aircraft.
We can use Bernoulli’s equation [(Eq. (1.3)] since the flow is incompres-
sible:
p1 þ 1
2 rV 2
1 ¼ p2 þ 1
2 rV 2
2
We will designate a point out in front of the aircraft as position 1 and the
point on the wing as position 2. First find the total pressure based on position
1 conditions. We will convert the airspeed to consistent units.
V1 ¼ 120 kn ¼ ð120 knÞ 1:69 ft=s
kn
 	
¼ 202:8 ft=s
and then find the total pressure.
p0 ¼ p1 þ 1
2 rV 2
1 ¼ 2116 þ 1
2 ð0:00238Þð202:8Þ2 ¼ 2165 psf
Because total pressure is constant,
p0 ¼ p2 þ 1
2 rV 2
2
we can solve for V2 :
V2 ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2ðp0  p2Þ
r
s
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2ð2165  2060Þ
0:00238
r
¼ 297 ft=s
10 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 26 of 650 --

1.1.7 	The Speed of Sound
For a perfect gas, the speed of sound (a) is calculated from the following
equation (refer to Ref. 3 for a detailed derivation):
a ¼ ffiffiffiffiffiffiffiffiffi
gRT
p ð1:4Þ
In this equation g is the ratio of specific heats. For most aerodynamic applica-
tions, it is assumed to be a constant equal to 1.4 for air. Note that the speed of
sound for a perfect gas is only a function of temperature. The propagation of a
sound wave takes place through molecular collisions. If the air molecules are
moving faster, because they are excited by high temperatures, then the speed
of the sound wave is faster. Temperature must be in R to obtain a speed of
sound in ft=s.
Example 1.6
What is the speed of sound if the air temperature is 70F?
First, we convert to absolute temperature.
T ¼ 70F ¼ 70 þ 460 ¼ 530R
Using Eq. (1.4),
a ¼ ffiffiffiffiffiffiffiffiffi
gRT
p ¼ ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ð1:4Þð1716Þð530Þ
p ¼ 1128 ft=s
1.1.8 	Mach Number and Aerodynamic Flight Regimes
Figure 1.10 presents a representative streamline around an aircraft. At any
point in the flowfield, the local Mach number (M ) can be defined as the ratio
of the local flow velocity to the local speed of sound,
M ¼ V
a ð1:5Þ
Fig. 1.10 	Local Mach numbers for a streamline around an aircraft.
A REVIEW OF BASIC AERODYNAMICS 	11

-- 27 of 650 --

The Mach number at point 2 is probably larger than the Mach number at point
1 because of the acceleration of the flow velocity around the contours of the
aircraft. Point 1 is sufficiently far ahead of the aircraft such that the properties
at that point have not been disturbed by the presence of the aircraft. With the
aircraft as the reference frame, V1 becomes the aircraft’s true airspeed. The
conditions at point 1 are called freestream conditions and denoted by a
subscript 1.
If the local speed of sound is the same as the local velocity, the Mach
number is 1.0 (or ‘‘sonic’’) at that point in the flow.
Figure 1.11 defines aerodynamic flight regimes based on freestream Mach
number. Four regimes are defined:
1) When the local Mach number is less than 1.0 everywhere in the flowfield,
the flow is ‘‘subsonic.’’
2) When the local Mach number is greater than 1.0 everywhere in the
flowfield, the flow is ‘‘supersonic.’’
3) When the flowfield has regions of both subsonic and supersonic flow, the
flowfield is ‘‘transonic.’’ Depending on airspeed and geometry, transonic
flow typically occurs at ‘‘freestream’’ Mach numbers between approxi-
mately 0.8 and 1.2.
4) A flow is called ‘‘hypersonic’’ when certain physical phenomena become
important that were not important at lower speeds. These include, for
example, high temperature effects and relatively thin shock layers. Typi-
cally, Mach 5 is used as the hypersonic threshold, but this value is greatly
dependent on the shape of the body of interest. Refer to Ref. 4 for more
detail.
The dynamic pressure, qq, may easily be defined in terms of Mach number
using Eqs. (1.4), (1.5), and the equation of state for a perfect gas.
qq ¼ 1
2 rV 2 ¼ 1
2 rðMaÞ2 ¼ 1
2 rM 2gRT
From the equation of state,
r ¼ p
RT
We thus have an alternate form for qq:
qq ¼ 1
2 gpM 2 	ð1:6Þ
Fig. 1.11 	Aerodynamic flight regimes.
12 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 28 of 650 --

1.2 	The Standard Atmosphere
A discussion of aerodynamics would not be complete without introducing
the concept of a standard atmosphere. Air pressure, temperature, and density
(also viscosity) are functions of altitude. The standard atmosphere, typically
presented in a tabular form, assigns values to these properties as they change
with altitude. It provides a common reference for Department of Defense
(DoD), academia, and industry.
For example, suppose the Air Force wants to purchase an interceptor. To
compare climb performance (critical to an interceptor mission) between
competing aircraft, manufacturers present data based on their aircraft operating
on a standard day, which is an imaginary day when the pressure, temperature,
and density behave exactly as defined in the standard atmosphere. Otherwise, it
would be nearly impossible to accurately assess how one aircraft performs
against another.
The standard atmosphere was generated by starting from an assumed
(easiest property to measure) temperature distribution. Figure 1.12 shows an
ideal variation of temperature with altitude based on many experimental
samplings. The temperature is assumed to remain constant between approxi-
mately 36,000 and 82,000 ft; this is called the isothermal region.
With a known temperature profile, two laws of physics (hydrostatic equation
and the equation of state) were used to mathematically ‘‘build’’ the standard
atmosphere. A current version of the standard atmosphere is presented in
Appendix B, and a more detailed discussion of the standard atmosphere devel-
opment is presented in Ref. 5. The standard atmosphere properties of tempera-
ture, density, and pressure may be presented in the form of ratios, as defined in
Eq. (1.7). Note: y, s, and d all have the value of 1.0 at sea level conditions:
y ¼ T
TSL
s ¼ r
rSL
d ¼ p
pSL
ð1:7Þ
Empirical equations have been developed to predict the temperature and
pressure ratios as a function of altitude. These predictions are aligned with the
Fig. 1.12 	Standard atmosphere temperature variation.
A REVIEW OF BASIC AERODYNAMICS 	13

-- 29 of 650 --

1962 U.S. Standard Atmosphere. They are divided into the altitude regions
below and above approximately 36,000 ft (the troposphere region where
temperature decreases at a linear rate, and the isothermal stratosphere region).
For altitudes (h) less than or equal to 36,089 ft, we have
y ¼ 1  6:875  106 h
d ¼ ð1  6:875  106 hÞ5:2561
s ¼ d
y
9
>	>	>	=
>	>	>	;
h  36;089 ft 	ð1:8Þ
For altitudes from 36,000 ft to approximately 65,600 ft, we have
y ¼ 0:75189
d ¼ 0:2234eð4:806105 ð36;089hÞÞ
s ¼ d
y
9
>	>	>	=
>	>	>	;
36;089 ft < h < 65;600 ft 	ð1:9Þ
The altitude (h) must be input in feet in the previous equations. The relation-
ship shown for density ratio can be derived using the equation of state for a
perfect gas.
Frequently, in the language of flight and aeronautical engineering, the terms
pressure, temperature, and density altitudes are used. Consider an aircraft
flying at 10,000 ft above sea level, as shown in Fig. 1.13.
For the ambient pressure and temperatures shown, we use the standard
atmosphere table to find these values. The standard atmosphere altitude corre-
sponding to a pressure of 1484 psf is 9500 ft, and the aircraft is said to be
flying at a pressure altitude (hp) of 9500 ft. Pressure altitude says nothing
about how high the aircraft is above the ground. Rather, the aircraft is
‘‘seeing’’ an air pressure as though it were flying at 9500 ft on a standard day.
Similarly, a temperature altitude (h T ) can be defined. For example, with
an ambient temperature of 479:5R, the aircraft is said to be at an 11,000-ft
temperature altitude because 479:5R is the standard atmosphere temperature
for 11,000 ft.
Density altitude (hr) follows the same approach. Pressure, temperature, and
density altitude relate pressure, temperature, and density, respectively, to the
standard atmosphere model. Simply stated, density altitude is the standard
Fig. 1.13 	Aircraft at specified flight conditions.
14 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 30 of 650 --

atmosphere altitude that has the same value of density as the conditions under
consideration.
1.3 	Airfoil Fundamentals
Figure 1.14 presents a sketch of an airfoil, or the cross section of a wing.
By definition, the flow over the airfoil is assumed to vary only in the x and z
(z is perpendicular to the surface) direction. The span (in the y-direction) is
assumed to approach infinity. Frequently, airfoils are also called two-dimen-
sional wings or infinite wings because wing-tip effects (refer to Sec. 1.4) are
ignored.
1.3.1 	Source of Aerodynamic Forces and Relative Motion
In Fig. 1.15, an airfoil is shown in a flowfield. The only way nature can
transmit an aerodynamic force is through pressure and shear stress distributions
acting on the airfoil surface. Pressure and shear stress act at every point on the
body, for example, points 1 and 2 in Fig. 1.15. Pressure always acts perpendi-
cular to the surface. Shear stress (tw) acts tangentially to the surface (or
‘‘wall’’)—like pressure, it has the dimensions of force per unit area (refer to
Sec. 1.3.3.1). The net effect is an aerodynamic force (Faero ). Later, we will
break Faero into lift and drag components and consider the moment created by
the pressure and shear stress distributions.
Fig. 1.14 	Airfoil section.
Fig. 1.15 	Pressure and shear stress vectors on an airfoil.
A REVIEW OF BASIC AERODYNAMICS 	15

-- 31 of 650 --

Incidentally, the same is true of any body in a flowfield, be it an automobile,
a ski jumper, or a cyclist—pressure and shear stress are the only physical
mechanisms that generate an aerodynamic force.
As you might expect, aerodynamic forces depend on the relative velocity
between the body and the air. Consider two cases, as shown in Fig. 1.16.
Shown is an airfoil on a test stand with air blowing over it at 300 ft=s and an
identical airfoil flying at 300 ft=s through still air.
The two airfoils have the same aerodynamic force, which is why wind
tunnels work.
1.3.2 	Lift
As shown in Fig. 1.17, lift (L) and drag (D) are the components of the aero-
dynamic force perpendicular and parallel, respectively, to the relative wind
(V1). In this section, we will focus on lift.
Recall that nature transmits an aerodynamic force through pressure and
shear stress distributions. The pressure distribution over an airfoil, or wing for
that matter, is primarily responsible for lift. Consider a pressure distribution as
shown in Fig. 1.18. The longer arrows denote pressures higher than freestream
pressure; shorter arrows are lower pressures.
Simply stated, lift is generated by creating a net pressure difference between
the upper and lower surfaces. As we will see later in this chapter, an airfoil’s
geometry is one of the keys to efficiently generating lift.
By referring to Fig. 1.19 and looking at continuity and Bernoulli’s equation,
we can gain some insight into how lift is generated. Although these two equa-
tions have several assumptions buried in them, they very nicely capture the
basic physics to explain lift. Air must speed up to get over the curved upper
surface of an airfoil. This can be viewed as an area constriction or nozzle
effect, with the continuity equation predicting an increase in velocity. As the
Fig. 1.16 	Airfoil on a test stand and an airfoil in flight.
Fig. 1.17 	Lift and drag components of Faero .
16 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 32 of 650 --

air speeds up, the pressure goes down, as predicted by Bernoulli’s equation.
The reduced pressure on the upper surface, relative to the higher pressure on
the lower surface, creates a lift force in the upward direction.
Note that the streamlines get closer (cross-sectional area goes down) as they
pass over the upper surface. From continuity, we know velocity must increase
to pass the mass between the streamlines; this is no different than putting your
thumb over the end of a garden hose to speed up the water. From Bernoulli’s
equation, we know that if velocity increases, pressure decreases. Therefore, a
high velocity implies low pressure, low velocity implies high pressure, and a
pressure differential between the upper and lower surfaces leads to lift. As you
might expect, the amount of lift depends on a number of parameters, for exam-
ple flow velocity and airfoil shape. This is discussed in subsequent sections.
1.3.3 	Drag
Refer again to Fig. 1.17 in which drag is the component of the aerodynamic
force parallel to V1. To gain an appreciation for drag, where it comes from
and its consequences, we need some more tools. We will start with the concept
of a viscous flow.
1.3.3.1 	Introduction to viscous flow. 	A viscous flow is one in which the
effects of viscosity, thermal conduction, and=or mass diffusion are important. As
a particle moves about in space, it carries with it its momentum, energy, and mass
(its identity). Viscosity is due to the transport of momentum—it is important if a
flowfield has large velocity gradients. Thermal conduction results from the
Fig. 1.18 	Pressure distribution over an airfoil.
Fig. 1.19 	Flow streamlines over an airfoil.
A REVIEW OF BASIC AERODYNAMICS 	17

-- 33 of 650 --

transport of energy and similarly is significant in regions of strong temperature
gradients. Mass diffusion is due to the transport of mass—it is important in
regions of strong concentration gradients, for example, in a chemically reacting
flowfield.
For the purpose of this book, we will ignore the effects of thermal conduc-
tion and mass diffusion. The airspeeds we are concerned with do not yield
flowfields where these effects are important. Therefore, in this book, a viscous
flow implies regions in which there are strong velocity gradients. Velocity
gradients cause shear stress. Remember from Sec. 1.3.1 that pressure and shear
stress distributions generate aerodynamic forces.
To understand why shear stresses exist, consider a shear flow as sketched in
Fig. 1.20.
The streamlines are horizontal; however, velocity varies in the y direction.
Therefore, a velocity gradient, in the y-direction, exists. Because there is a
velocity gradient, a fluid element above the plane a–b is moving faster than a
fluid element below the plane. There is a rubbing action, or friction, between
the fluid elements because of the different velocities. Because of an exchange
of momentum (mass times velocity) between the fluid elements, a force is
exerted on the plane a–b. We give it a special name, shear stress (ta–b), where
the subscript denotes the stress is acting on the plane a–b.
As you might expect, shear stress (t) is proportional to the strength of the
velocity gradient. The constant of proportionality is called the coefficient of
viscosity and is given the symbol m.
t / dV
dy

ab
t ¼ m dV
dy

ab
ð1:10Þ
Physically, viscosity is a measure of a fluid’s resistance to shear and has the
dimensions of mass=(length  time). The standard day sea level value for viscos-
ity is
m ¼ 3:7373  107 slug=ðft  sÞ
Fig. 1.20 	Illustration of a shear flow.
18 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 34 of 650 --

The coefficient of viscosity is a function of temperature. Qualitatively, its value
changes as shown in Fig. 1.21.
From the figure, it is apparent that the viscosity of air increases as tempera-
ture increases. Recall, viscosity is due to the transport of momentum. Air
molecules have more velocity and, hence, more momentum in high-temperature
flowfields.
1.3.3.2 	The concept of a boundary layer. 	Consider the flow over an
airfoil, as shown in Fig. 1.22.
There is a relatively small region adjacent to the airfoil where the effects of
viscosity (or friction) must be taken into account. Called a boundary layer, the
concept was introduced by Ludwig Prandtl in 1904. Outside this region, the
flowfield is assumed to be inviscid or frictionless.
Within a boundary layer, velocity gradients are severe—the flow is retarded
because of the presence of the body. From our previous discussion, this implies
that viscous effects are important. As presented in Fig. 1.23, a boundary-layer
profile describes how the flow velocity changes in a direction normal (in the y
direction as shown) to the surface of a wing, fuselage, or any solid surface
exposed to an air stream.
Note that the velocity is zero at the surface, which is the so-called ‘‘no slip
boundary condition.’’ Frequently, the subscript w (for ‘‘wall’’) is used to denote
the surface boundary conditions. The effect of friction, between the air and the
body, diminishes in the y direction. Hence, the velocity increases through the
boundary layer (in the y direction) until eventually the presence of friction is
Fig. 1.21 	Coefficient of viscosity as a function of temperature.
Fig. 1.22 	Flow over an airfoil with boundary layer region.
A REVIEW OF BASIC AERODYNAMICS 	19

-- 35 of 650 --

no longer felt, and the velocity gradient approaches zero. The boundary layer
thickness is denoted by d.
Two types of boundary layers exist: laminar and turbulent. A laminar
boundary layer is characterized by smooth and regular streamlines, or smoothly
layered flow. In contrast, a turbulent boundary layer is ‘‘random, irregular, and
tortuous.’’7 Laminar and turbulent velocity profiles are different. To gain some
insight into the differences, consider the flow over a flat plate. At some stream-
wise distance, two representative velocity profiles are shown in Fig. 1.24:
The turbulent profile does not imply a nice, orderly boundary layer. Rather,
what is really shown is how the average velocity changes in the y direction.
From the figure, note the following
1) A turbulent boundary layer is thicker than a laminar boundary layer
(dturb > dlam ). For a flat plate, the freestream velocity (V1) is 99.9%
recovered at the edge of the boundary layer.
2) The velocity gradient at the wall is greater for a turbulent boundary layer.
For a given y distance, the turbulent velocity is greater than the laminar
velocity.
Fig. 1.23 	Boundary-layer profile.
Fig. 1.24 	Laminar and turbulent boundary layer profiles.
20 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 36 of 650 --

3) The shear stress at the wall is higher for a turbulent boundary layer
[twÞturb > twÞlam ]. This implies a higher skin friction drag for a turbulent
boundary layer.
1.3.3.3 	Reynolds number and transition. 	Consider the flow over a
sharp flat plate as shown in Fig. 1.25; the distance ‘‘x’’ is measured from the
leading edge.
The Reynolds number, based on a characteristic length (in this case x), is
defined as
Re x ¼ r1V1x
m1
ð1:11Þ
Physically, the Reynolds number is a ratio of inertia forces to viscous forces—
it is nondimensional. For nearly all our applications, the Reynolds number is
relatively high (on the order of 10 4 10 8 ) and inertia forces dominate.
The Reynolds number is useful in predicting if a boundary layer is laminar
or turbulent. Transition is defined as the point (in reality a relatively small
region) where the boundary layer changes from laminar to turbulent. Once
again, consider the flow over a sharp flat plate as shown in Fig. 1.26.
Typically, a boundary layer starts as laminar. Eventually, for a variety of
reasons, it will transition to being turbulent. The distance xcrit locates the transi-
tion point. In reality, there will be a transition region, where the boundary layer
has pockets of both laminar and turbulent flow. A Reynolds number, based on
xcrit , is defined as
Re xcrit ¼ r1V1xcrit
m1
ð1:12Þ
or
xcrit ¼ Re xcrit m1
r1V1
ð1:13Þ
For the case of flow over a smooth flat plate, the critical Reynolds number is
approximately 500,000. Therefore, given the freestream conditions, the critical
Fig. 1.25 	Flow over a flat plate.
A REVIEW OF BASIC AERODYNAMICS 	21

-- 37 of 650 --

Reynolds number provides a means to predict where transition will occur,
which is very handy, but very arbitrary.
Various factors influence where transition takes place. For example, surface
roughness will trip a boundary layer and cause it to go turbulent earlier than
expected. Additionally, surface temperature, Mach number, and pressure gradi-
ents all affect transition. Because of its significant ramifications, researchers
will continue working to find better ways to predict transition.
Example 1.7
A flat plate with a 1-ft length in a wind tunnel test section is being tested at
150 and 300 ft=s at standard sea-level conditions. If the critical Reynolds
number is 500,000, find the location where the flow transitions from laminar to
turbulent for each velocity.
Using Eq. (1.13), we have at 150 ft=s:
xcrit ¼ Re xcrit m1
r1V1
¼ ð500;000Þð3:737  107Þ
ð0:00238Þð150Þ ¼ 0:523 ft
At 300 ft=s we have:
xcrit ¼ Re xcrit m1
r1V1
¼ ð500;000Þð3:737  107Þ
ð0:00238Þð300Þ ¼ 0:262 ft
Thus, we can see that the transition point moves forward as the velocity is
increased. The 300 ft=s case is illustrated next.
Fig. 1.26 	Typical boundary layer transition from laminar to turbulent flow.
22 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 38 of 650 --

1.3.3.4 	Skin friction drag. 	Because of the presence of friction between an
aerodynamic body and the flowfield, two forms of drag are created: skin friction
drag and pressure drag. We will discuss skin friction drag first.
Consider the flowfield in Fig. 1.27.
Within the boundary layer, the velocity increases from zero at the surface.
This velocity gradient causes a shear stress (tw) at the surface, or wall—recall
Eq. (1.10) for shear stress, which has the dimensions of force per unit area.
When integrated over the entire surface area, the result is called skin friction
drag and given the notation D f .
The skin friction coefficient, Cf , is defined as
Cf ¼ Df
qq1Swet
ð1:14Þ
Swet is the so-called ‘‘wetted area,’’ which is a surface area that would get wet
if the aerodynamic body were in water. C f is obviously going to depend on
freestream conditions and boundary layer type. For the simple case of flow
over a flat plate, experimental=theoretical values of skin friction coefficient are
presented in the following equations:
Cf ¼ 1:328
ffiffiffiffiffiffiffiffi
ReL
p 	ðlaminarÞ 	C f ¼ 0:074
ðReLÞ1=5 	ðturbulentÞ
The equations assume a fully laminar or turbulent boundary layer from the
leading edge (that is, with no transition).
Although simple relationships, the results give some valuable physical
insight. Note the Reynolds number dependence, where L is the characteristic
length (the total running length of the flat plate in this case). For a given
Reynolds number, C f is greater for the turbulent case. Because there is such a
close relationship between Reynolds number and boundary layer type (hence
shear stress), this result is not surprising. Regardless of the aerodynamic shape,
a laminar boundary layer will cause less skin friction drag than a turbulent
boundary layer.
D f Þturbulent > Df Þlaminar
Fig. 1.27 	Boundary layer velocity profile.
A REVIEW OF BASIC AERODYNAMICS 	23

-- 39 of 650 --

Example 1.8
A rectangular wing has a 5-ft chord and a 40-ft span. Estimate the skin fric-
tion drag acting on the wing at a velocity of 100 ft=s and sea-level conditions
assuming the critical Reynolds number is 600,000.
We will first calculate the transition location using Eq. (1.13).
xcrit ¼ Re xcrit m1
r1V1
¼ ð600;000Þð3:737  107Þ
ð0:00238Þð100Þ ¼ 0:942 ft
We will next assume turbulent flow for the entire wing and compute Df using
the second equation from Table 1.2.
Df ¼ C f
1
2
 
rV 2S
Cf ¼ 0:074
Re0:2
L
For the entire wing, L ¼ 5 ft, so that
Re L ¼ rVL
m ¼ ð0:00238Þð100Þð5Þ
3:737  107 	¼ 3:18  10 6
and
S  ð5 ftÞð40 ftÞ ¼ 200 ft 2 for the upper surface of the wing
Cf ¼ 0:074
ð3:18  10 6Þ0:2 ¼ 0:0037
D f turbulent
wing
¼ ð0:0037Þ 1
2
 
ð0:00238Þð100Þ2ð200Þ ¼ 8:81 lb ðon one wing surfaceÞ
However, the flow is not turbulent over the entire wing; therefore, we next
calculate the turbulent skin friction drag associated with the laminar region so
it can be subtracted out from the previous result. For the laminar region
Re L ¼ rVL
m ¼ ð0:00238Þð100Þð0:942Þ
3:737  107 	¼ 6:0  10 5
Cf ¼ 0:074
ð6  10 5Þ0:2 ¼ 0:00517
Dfturbulent
forward
wing
¼ ð0:00517Þ 1
2
 
ð0:00238Þð100Þ2ð0:942  40Þ ¼ 2:32 lb ðone surfaceÞ
24 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 40 of 650 --

The turbulent skin friction drag on the portion of the wing aft of xcrit is thus:
D fturbulent
aft wing
¼ Dfturbulent
wing
 D fturbulent
forward
wing
¼ 8:81  2:32 ¼ 6:49 lb ðone surfaceÞ
We must next calculate the skin friction drag on the forward portion of the
wing which is in laminar flow. Using the first equation from Table 1.2,
C f ¼ 1:328
ffiffiffiffiffiffiffiffi
ReL
p 	¼ 1:328
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
6:0  10 5
p 	¼ 0:00171
where
Re L ¼ rVL
m ¼ ð0:00238Þð100Þð0:942Þ
3:737  107 	¼ 6:0  10 5
The laminar skin friction drag on the upper wing surface is then,
Dflaminar
forward
wing
¼ Cf
1
2
 
rV 2S ¼ 0:00171 1
2
 
ð0:00238Þð100Þ2ð0:94  40Þ ¼ 0:765 lb
and the total skin friction drag on the upper surface is
Df ¼ D flaminar
forward
wing
þ Dfturbulent
aft wing
¼ 0:765 þ 6:49 ¼ 7:255 lb
For the upper and lower surface of the wing, we simply multiply by two.
D fwing ¼ 2ð7:255Þ ¼ 14:53 lb
A sketch (not to scale) of the wing is shown:
A REVIEW OF BASIC AERODYNAMICS 	25

-- 41 of 650 --

1.3.3.5 	Pressure drag. 	As discussed, the presence of friction leads to
skin friction drag. Additionally, friction also causes another form of drag; this is
called drag due to the pressure field or simply pressure drag. To understand the
concept of pressure drag, consider the viscous flow over a cylinder, as sketched in
Fig. 1.28—two representative streamlines are shown.
Because the velocity is zero at point 1, it is called a stagnation point. Pres-
sure is a maximum here—recall the inverse relationship between velocity and
static pressure. Between 1 and 2, the flow accelerates to its maximum velocity
and achieves a minimum pressure. Aft of point 2, the pressure begins to
increase. In the meantime, friction has sufficiently reduced the flow’s energy
such that it cannot overcome the increasing pressure aft of point 2. The flow
separates and a wake is formed on the aft side of the cylinder. Pressure drag is
created.
Qualitatively, the pressure ( p) on the cylinder’s surface is shown in Fig.
1.29—j (see Fig. 1.28) is 0 deg at the stagnation point, 90 deg at Point 2.
Note the difference between the high pressure on the front (pushing the cylin-
der to the right) and relatively lower pressure on the back (pushing to the left).
This leads to pressure drag.
Physically, the same thing happens for an airfoil. Consider Fig. 1.30. Once
again, the pressure is highest at the stagnation point. Over the upper surface,
the velocity increases to a maximum—a minimum pressure is reached. Aft of
this point, the pressure increases. When pressure increases in the streamwise
direction, the pressure gradient is called adverse. In contrast, if the pressure
gradient decreases in the streamwise direction, the gradient is favorable. When
the flowfield has insufficient momentum (or energy) to overcome the adverse
Fig. 1.28 	Flow over a cylinder.
Fig. 1.29 	Pressure distribution on a cylinder’s surface.
26 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 42 of 650 --

pressure gradient, it separates from the upper surface and the airfoil stalls.
Drag goes up; lift goes down.
Because the physics of flow separation is so important, we will look at it
again but from the perspective of the velocity profiles inside the boundary
layer. Consider the boundary layer on the upper surface of an airfoil as shown
in Fig. 1.31—x is a running length along the airfoil’s surface.
We will assume the boundary layer transitions to turbulent at xcrit . Friction
takes its toll, and eventually the fluid particles near the surface have insufficient
energy to overcome the adverse pressure. The fluid particles slow down, and
then stop—this is the separation point. The velocity gradient at the wall is
zero. Downstream of this point, the fluid particles may actually backup (called
flow reversal) because of an adverse pressure gradient.
How can separation be delayed? We can energize the boundary layer by
increasing the momentum, or kinetic energy, of the fluid elements within it.
This is most easily accomplished by tripping the boundary layer to make it
turbulent. Recall, a turbulent boundary layer has a larger (than laminar) velo-
city gradient near the wall. Therefore, a turbulent boundary layer has more
momentum and thus is able to withstand an adverse pressure gradient longer
before separating. Vortex generators, and various other boundary layer control
(BLC) devices, are all designed to delay separation and consequently reduce
the penalties associated with pressure drag.
Obviously, the stronger the adverse pressure gradient, the more susceptible
an airfoil will be to flow separation and a stalled condition. Therefore, airfoil
Fig. 1.30 	Pressure regions on an airfoil.
Fig. 1.31 	Boundary layer velocity profiles.
A REVIEW OF BASIC AERODYNAMICS 	27

-- 43 of 650 --

design and orientation to the freestream velocity are critical to an efficient lift-
ing surface.
Another type of pressure drag is referred to as base drag. Base drag is typi-
cally associated with long, slender shapes, such as missiles and fuselages,
which have relatively blunt aft ends. For example, a cylindrical missile of
constant diameter may simply end at the rear of the missile without tapering to
a point. A separated flow region will exist at the base or aft area of the missile
because the flow will not be able to stay attached around the sharp corner of
this base region. Base drag can account for up to 50% of the total drag on a
missile or projectile. Fig. 1.32 presents a variation of base drag with Mach
number for a missile with a length to diameter ratio of 7.2.
1.3.3.6 	Profile drag. 	The combined drag because of skin friction and
flowfield separation (pressure drag) is called profile drag.
D ¼ D f þ D p
We have arrived at one of the great compromises of aerodynamics. A laminar
boundary layer decreases skin friction drag but very likely will increase pres-
sure drag. A turbulent boundary layer will typically reduce pressure drag, but
will increase skin friction drag. Ultimately, the shape=orientation of the body
will dictate which type of drag is dominant. As you might expect, skin friction
is dominant for slender bodies, while pressure drag dominates blunt or bluff
bodies.
Consider the flow over a sphere. Qualitatively, a graph of profile drag vs
Reynolds number is shown in Fig. 1.33. Incidentally, the easiest way to change
Reynolds number is to change velocity. Note the dramatic decrease in drag
when the Reynolds number is sufficiently large enough to cause the laminar
boundary layer to transition to turbulent. Although skin friction drag increases
Fig. 1.32 	Variation of base drag coefficient with Mach number for a missile shape
with 7.2 fineness ratio (see Ref. 6).
28 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 44 of 650 --

with a turbulent boundary layer, pressure drag is clearly dominant for a sphere
(bluff body). A turbulent boundary layer, with its higher energy flow, can
better overcome the strong adverse pressure gradient, thereby reducing the
overall profile drag.
Example 1.9
An illustration of two spheres in flow at the same velocity is shown below.
There’s only one difference between the two cases—the one on the left has a
smooth surface and the one on the right has a dimpled surface to trip a turbu-
lent boundary layer. Which ball has lower separation drag?
Separation is significantly delayed on the ball on the right. As a result, the
overall profile drag is reduced because separation drag is significantly larger
than skin friction drag. For this same reason, golf balls have dimples so that
the ball will travel farther in the air. In Sec. 1.3.5, we’ll examine airfoil data
and reinforce the impact a boundary layer has on profile drag.
1.3.4 	Airfoil Terminology
Airfoils are the fundamental building block for aircraft wing and tail surface
design. In this section we will discuss the definition of airfoil configurations
and aerodynamic characteristics.
Fig. 1.33 	Drag variation with Reynolds number.
A REVIEW OF BASIC AERODYNAMICS 	29

-- 45 of 650 --

1.3.4.1 	Geometry and nomenclature. 	The concept of an airfoil (wing
cross section) was introduced at the beginning of Sec. 1.3. Defining the geometry
of an airfoil can get complicated (refer to Ref. 7). In this book, we will use a few
common definitions to grasp the basics of airfoil geometry. Consider Fig. 1.34.
Leading edge and trailing edge are self-explanatory. Other definitions
follow:
1) A straight line, passing through the leading and trailing edge, is called the
chord line. The straight-line distance between the leading and trailing edge
is the chord.
2) The mean camber line is the locus of points halfway between the upper and
lower surfaces, as measured perpendicular to the mean camber line itself—
positive camber is shown (typical for wing sections).
3) The max camber (sometimes called simply camber) is the maximum
distance between the mean camber line and the chord line, as measured
perpendicular to the chord line.
4) The thickness is the distance between the upper surface and lower surface,
as measured perpendicular to the mean camber line.
5) The angle of attack (a) is the angle between the chord line and the
freestream velocity (V1), or relative wind.
6) The airfoil in Fig. 1.34 is cambered. For the case of an uncambered, or
symmetric, airfoil the top and bottom surface are identical—the mean
camber line is the same as the chord line.
For convenience, government and industry have devised numerous ways to
geometrically describe, with numbers and letters, various airfoil shapes. One
extremely common airfoil designation is the National Advisory Committee for
Aeronautics (NACA), a precursor to NASA, four-digit series. Four digits
define an airfoil shape: the first is the amount of maximum camber in percent
of chord, the second is the location of the maximum camber in tenths of chord,
the last two digits are the maximum thickness of the airfoil in percent of
chord. For example, a NACA 2412 airfoil would have a two percent
(0.02chord) maximum camber, the maximum camber would occur at the
40% chord location (x ¼ 0.4chord), and the maximum thickness would be
12% of the chord length (0.12chord). There are several other NACA designa-
Fig. 1.34 	Airfoil geometry.
30 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 46 of 650 --

tions to describe airfoil shapes. A good reference is Theory of Wing Sections
by Abbot and Von Doenhoff.
Data for the four-digit series was published by NACA in the 1920s and
1930s and is still widely used to verify computer code and experimental
results. We’ll use NACA four-digit graphs in Sec. 1.3.5 to demonstrate how to
read and interpret airfoil data. Appendix C presents data for selected NACA
airfoils.
1.3.4.2 	Lift, drag, and moment coefficients. 	Consider an airfoil, at some
angle of attack, as shown in Fig. 1.35. Again, lift and drag are the components of
the aerodynamic force perpendicular and parallel to the freestream velocity,
respectively. In general, the pressure and shear stress distributions also cause a
moment (M ), where pitch up (as shown) is considered positive. When comparing
airfoil (or for that matter, aircraft) performance, values of lift, drag, and moments
are somewhat meaningless. For example, one aircraft might generate twice the
lift, but do so very inefficiently, in terms of its design and airspeed.
Therefore, dimensionless coefficients are used. Lift, drag, and moment coef-
ficients lend themselves beautifully when comparing aerodynamic performance.
Their definition and significance stem from a principle called dynamic similar-
ity. Consider the flow over two bodies. By definition, the flows are dynamically
similar if
1) Geometric similarity exists (the bodies look alike, scale models) and
2) Similarity parameters are the same.
If the flows are dynamically similar, then the force and moment coefficients will
be equal and the streamline pattern over each body will be geometrically similar.
The key is determining the governing similarity parameters. Dimensional
analysis (for example, the Buckingham Pi theorem) provides a mechanism. By
applying dimensional analysis to an aircraft, 8 the following force=moment coef-
ficients are defined:
C L ¼ L
qq1S ð1:15Þ
CD ¼ D
qq1S ð1:16Þ
CM ¼ M
qq1S cc ð1:17Þ
Fig. 1.35 	Aerodynamic forces and moments on an airfoil.
A REVIEW OF BASIC AERODYNAMICS 	31

-- 47 of 650 --

S is a reference area—planform (top view) area of the aircraft’s wing, qq1 is
the freestream dynamic pressure ( 1
2 rV 2
1), and cc is the aircraft’s mean aero-
dynamic chord (MAC) as defined in Sec. 1.4.1.
When discussing airfoils, these forms of the coefficients are inconvenient.
Recall from Sec. 1.3, wing tips are considered to approach infinity, thus
making the planform area meaningless. To avoid this, airfoil data are presented
in terms of lift, drag, and moment, per unit span. Refer to the airfoil section in
Fig. 1.36.
The distance between wing tips is called the span (b). When collecting
airfoil data, this is the width of the wind tunnel’s test section, ensuring that
wing tip effects are not included in the force and moment results. Because
airfoil sections are not tapered, the mean chord is just the airfoil’s chord.
Therefore, the planform area is simply
S ¼ b  c
Substituting the above for S, and manipulating the equations, leads to the
following form of the coefficients. Note that the numerator is now lift per unit
span, for example. A lower case is also used to denote airfoil (not aircraft)
data.
C l ¼ L=b
qq1c ð1:18Þ
C d ¼ D=b
qq1c ð1:19Þ
Cm ¼ M =b
qq1c2 	ð1:20Þ
These coefficients, regardless of which form, are a function of three similarity
parameters: Mach number, Reynolds number, and angle of attack. Therefore, if
a scale model is tested in a wind tunnel, with Reynolds number, Mach number,
and angle of attack equal to those in a flight test, the coefficients should accu-
rately predict the forces and moments in flight, which is an extremely powerful
experimental tool!
Fig. 1.36 	Airfoil characteristics.
32 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 48 of 650 --

How do lift, drag, and moment coefficients change with these similarity para-
meters? The answer is discussed in later sections.
1.3.4.3 	Center of pressure and aerodynamic center. 	Any point can be
chosen on an airfoil to represent the aerodynamic forces (lift and drag) and
moment. Before defining two special points, the center of pressure and the
aerodynamic center, we will discuss how a moment arises. Figure 1.37 shows the
pressure distribution about an airfoil (ignoring shear stress contributions). F1 is
the net downward force because of the pressure distribution on the upper surface
of the airfoil. Likewise, F2 is the net upward force. If we choose to support
the airfoil about an arbitrary point at the quarter chord location (indicated by
the black dot), an aerodynamic moment also results about this point. In this
case, the airfoil will tend to pitch down about the quarter chord point because of
the aerodynamic pressure distribution. For a given angle of attack and Reynolds
number, there is one location, called the center of pressure where the aerodynamic
moment about that point is zero. Refer to Fig. 1.38.
The center of pressure is not a very convenient reference point, in that a
change in either angle of attack or Reynolds number (visualize as a change in
freestream velocity) will cause the center of pressure location to shift.
In contrast, there is one point on the airfoil, called the aerodynamic center,
where the moment coefficient about that point remains constant with changes
Fig. 1.37 	Pressure distribution about an airfoil.
Fig. 1.38 	Illustration of center of pressure.
A REVIEW OF BASIC AERODYNAMICS 	33

-- 49 of 650 --

in angle of attack and Reynolds number. It is fixed on the airfoil and located at
approximately the quarter chord for subsonic flow. If you supported an airfoil
at the aerodynamic center, the aerodynamic moment about the aerodynamic
center would stay constant as angle of attack was changed (and velocity was
held constant). Likewise, if both angle of attack and velocity were changed, the
aerodynamic moment coefficient about the aerodynamic center would stay
constant. See Fig. 1.39.
Again, pitch up is positive by our convention. For an airfoil with positive
camber in subsonic flow, the moment about the aerodynamic center will be
negative (nose down). In transonic and supersonic flow conditions, the location
of the aerodynamic center moves aft.
1.3.5 	Airfoil Data
Recall that airfoil force and moment coefficients are a function of angle of
attack, Reynolds number, and Mach number. In this section, we will focus on
how angle of attack and Reynolds number affect these coefficients. Mach
effects will be discussed in the next section.
A typical lift curve (graph of lift coefficient vs angle of attack), for a posi-
tively cambered airfoil, is presented in Fig. 1.40.
A plot of Cl vs a is one of the classics of aerodynamics. A couple key
points about a lift curve follow:
1) At some angle of attack, astall , lift dramatically decreases and the airfoil
stalls because of flow separation.
2) Just before stalling, the airfoil reaches a maximum lift coefficient; this is
denoted by C lmax .
Fig. 1.39 	Illustration of aerodynamic center for subsonic flow.
34 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 50 of 650 --

3) The lift curve slope (denoted by C la ) is typically linear below stall; its slope
is about 0.11=deg.
4) At some angle of attack, the lift coefficient is zero; this is called the zero lift
angle of attack, or aL¼0. This occurs at a negative angle of attack (chord
line oriented below the freestream velocity) for an airfoil with positive
camber. At aL¼0 , no lift is generated.
5) Lift is generated when an airfoil with positive camber is at zero degrees
angle of attack. This is usually desirable in aircraft design.
6) An increase in Reynolds number tends to increase max lift and delay the
onset of stall. Does this make sense? (Hint: think about the physics of
stall.)
The lift curve for a symmetric airfoil looks basically the same. However,
there is one significant difference: the curve passes through the origin. Con-
vince yourself that this makes sense. The equation for predicting Cl in the linear
region is
Cl ¼ Cla ða  aL¼0Þ 	ð1:21Þ
This equation is used to predict C l as a function of angle of attack when Cla
and aL¼0 are known.
A typical drag polar, or graph of drag coefficient vs lift coefficient, is
shown in Fig. 1.41. Because lift coefficient and angle of attack vary linearly
(before stall), it is easier to interpret these graphs if lift coefficient is visualized
as an angle of attack. High Cl implies high a.
Cd is the airfoil’s profile drag coefficient—it includes skin friction and pres-
sure drag. Like the lift curve, it is critical to understand what a drag polar is
‘‘saying.’’ Key points:
Fig. 1.40 	Airfoil lift curve.
A REVIEW OF BASIC AERODYNAMICS 	35

-- 51 of 650 --

1) When C d is plotted against C l , the graph is parabolic in nature. As lift
increases, drag increases in a parabolic fashion. To explain this, consider
what the oncoming flow ‘‘sees’’ at low and high lift coefficients (or a’s).
a) Drag is a minimum at the smaller lift coefficients (small a). Here, the
oncoming flow ‘‘sees’’ a slender body—skin friction dominates and
there is very little pressure drag.
b) Drag reaches a maximum at the larger lift coefficients (high a). The
airfoil is no longer slender—it is a blunt body! Skin friction drag is still
present, but pressure drag becomes increasingly important!
2) This drag polar is for a symmetric airfoil. The data are symmetric about the
y axis, with minimum drag at a lift coefficient equal to zero (a ¼ 0). For a
positively cambered airfoil, the curve shifts to the right.
3) As with the lift curve, Reynolds number has little effect at the low lift
coefficients. However, as the angle of attack increases, Re becomes
important. Why?
Fig. 1.41 	Airfoil drag polar.
Fig. 1.42 	Moment coefficient about the aerodynamic center lift coefficient.
36 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 52 of 650 --

Figure 1.42 is a graph of the moment coefficient about the aerodynamic
center vs lift coefficient (or angle of attack) for a positively cambered airfoil.
The key points are
1) The moment coefficient about the aerodynamic center remains constant
with Reynolds number and angle of attack variation.
2) The moment coefficient about the aerodynamic center for an airfoil with
positive camber is negative—the airfoil has a pitch-down tendency. Later,
we will see that this has important ramifications in terms of longitudinal
stability.
Example 1.10
A NACA 4412 airfoil with a 2-ft chord and a 5-ft span is being tested in a
wind tunnel at standard sea-level conditions and a test section velocity of 240
ft=sec and an angle of attack of 8 deg. What is the airfoil’s maximum thick-
ness, maximum camber, location of maximum camber, and zero-lift angle of
attack? Also, calculate the lift, drag, and pitching moment about the aero-
dynamic center.
The 	airfoil 	maximum 	thickness, 	camber, 	and 	location 	of 	maximum
camber depend only on the NACA 4412 airfoil shape and length of the
airfoil chord. The first digit of the 4412 designation specifies a maximum
camber, which is 4% of the 2-ft chord or 0.08 ft. The second digit indicates the
chordwise location of the point of maximum camber which is 0.4 c or 0.8 ft aft
of the leading edge. The last two digits specify a 12% thick airfoil, and there-
fore the maximum thickness is 0.12 c or 0.24 ft. The aerodynamic properties of
the airfoil may depend on Reynolds number, which for the given test condi-
tions is
Re ¼ rVc
m ¼ ð0:00238Þð240Þð2Þ
3:737  107 	¼ 3:06  10 6
We will thus use the airfoil curves for Re ¼ 3  10 6
. The value of the zero lift
angle of attack does not, in fact, vary significantly with Reynolds number as
we check the first NACA chart. The Cl at an angle of attack of 8 deg does
show some slight variation with Reynolds number. These values are obtained
from the NACA 4412 airfoil charts7 as
aL¼0 ¼ 4
Cla¼8 ¼ 1:2
A REVIEW OF BASIC AERODYNAMICS 	37

-- 53 of 650 --

The profile drag coefficient and pitching moment coefficient about the aero-
dynamic center are obtained from the second chart just shown for a Cl of 1.2
and a Reynolds number of 3  106 .
Cd ¼ 0:013 	and 	Cm AC ¼ 0:1
We can then determine the lift, drag, and moment about the aerodynamic
center given that S is 10 ft2 (2 ft chord  5 ft span).
L ¼ Cl
1
2 rV 2
 	
S ¼ 1:2 1
2 ð0:00238Þð240Þ2
 	
ð10Þ ¼ 822:5 lb
D ¼ Cd
1
2 rV 2
 	
S ¼ 0:013 1
2 ð0:00238Þð240Þ2
 	
ð10Þ ¼ 8:91 lb
M AC ¼ Cm AC
1
2 rV 2
 	
Sc ¼ 0:1 1
2 ð0:00238Þð240Þ2
 	
ð10Þð2Þ ¼ 137:1 ft  lb
Note that the second chart also gives the exact location of the aerodynamic
center which is very close to the quarter chord, as previously discussed.
1.3.6 	Compressibility (Mach) Effects
Earlier we said that lift, drag, and moment coefficients were a function of
Reynolds number, angle of attack, and Mach number. The airfoil data we
38 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 54 of 650 --

examined in the previous section were for low speed or incompressible flow.
The influence of Reynolds number and angle of attack were shown, but no
compressibility (or Mach) effects were shown.
At Mach 0.3, our threshold for compressible flow, the density of air changes
approximately 5% from its static value. As Mach number increases beyond
0.3, it is no longer reasonable to ignore the effects of compressibility. Depend-
ing on the shape of the body, at Mach numbers approaching the speed of
sound and beyond, shock waves develop, significantly changing the aerody-
namic properties of the flowfield. Figure 1.43 identifies how the flowfield prop-
erties change across a normal shock. In this figure, station 1 is ahead of the
normal shock, and station 2 is behind.
A shock wave is very thin (on the order of 105 cm) and very viscous.9
Velocity and Mach number abruptly decrease across a shock. Total pressure,
which is a measure of the flow’s energy, decreases. All the static properties
increase, including pressure. It is this ‘‘shock jump’’ in pressure that has the
most profound effect on the force=moment coefficients.
To understand how compressibility influences force and moment coeffi-
cients, we need to introduce the definition of the critical Mach number (Mcrit ).
Consider an airfoil as shown in Fig. 1.44 and assume the freestream Mach
number is gradually increased.
As the Mach number increases, the properties in the flowfield surrounding
the airfoil will naturally change. At some freestream Mach number, called the
critical Mach number, sonic flow will first be achieved at a point in the flow-
field (usually close to the surface of the airfoil).
Figure 1.45 is a qualitative sketch showing the variation of an airfoil’s lift
coefficient with Mach number.
As you might expect from the rapid changes in lift coefficient, the flowfield
is changing dramatically as the Mach number is increased. Figure 1.46, based
on flow visualization, shows changes in shock wave formation for the points
labeled a through e in Fig. 1.45.
The following are the significant points from Figs. 1.45 and 1.46:
Fig. 1.43 	Property changes across a normal shock.
A REVIEW OF BASIC AERODYNAMICS 	39

-- 55 of 650 --

1) The flowfield is subsonic until point a. Typically, a compressibility
correction known as the Prandtl–Glauert rule is used in this region. The
equation is shown:
Cl ¼ C l0	
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  M 2
p 	ð1:22Þ
Cl0 	is an incompressible lift coefficient (the subscript 0 signifies
Mach ¼ 0.0). This is the lift coefficient found in typical airfoil data as
discussed in Sec. 1.3.5. The Prandtl–Glauert rule is a reasonable correc-
tion below the critical Mach number, Mcrit . A rule of thumb is to only
use Prandtl–Glauert to Mach 0.7.
2) At point b, the flow is supersonic over most of the upper surface,
terminating in a shock wave. Pressure increases across a shock, thus
causing increased likelihood of the flow separating from the airfoil’s
surface. An adverse pressure gradient is created by the presence of the
shock wave.
Fig. 1.44 	Illustration of critical Mach number.
Fig. 1.45 	Variation of airfoil lift coefficient with Mach number.
40 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 56 of 650 --

3) At point c, the flow over the lower surface is essentially all supersonic. The
pressure on the lower surface is less than it was at condition b. The upper
surface is relatively unchanged. The net effect is a smaller lift coefficient.
4) Between points c and d, the shock waves, on both surfaces, move aft and
the lift coefficient increases.
5) As the freestream Mach number increases, a bow shock (or bow wave)
forms. Because the velocity decreases across this initial shock, the shocks
at the trailing edge are relatively weaker. The pressure differential, between
the upper and lower surface, decreases and lift coefficient decreases.
It is important to recognize that the dynamic pressure, qq1 ð1=2r1V 2
1) is
increasing with Mach number. Therefore, although the lift coefficient may be
decreasing, lift can actually be increasing through the dynamic pressure term.
L ¼ Cl qq1S
At high Mach numbers, the lift coefficient is typically an order of magnitude
less than its value at low speeds.
A qualitative sketch of how an airfoil’s drag coefficient changes with Mach
number is shown in Fig. 1.47.
Note the increase in drag preceding Mach 1.0. This is where the term drag
barrier initially came from. At some freestream Mach number, beyond Mcrit ,
drag increases rapidly. This is called the drag divergence Mach number, M DD.
Drag divergence is primarily because of the formation of shock waves on the
airfoil’s surface. This, in turn, causes drag because of flowfield separation. A
typical definition of where the drag divergence Mach number occurs is
@CD=@M > 0:1 (Ref. 10).
High speed flow and the accompanying compressibility have introduced a
new form of drag called wave drag, D wðCd w in coefficient form). This form of
drag is only present at transonic and supersonic speeds. In addition to the drag
associated with shock-induced flow separation, drag is created simply by the
pressure increase across shocks. For example, consider the supersonic flow
over a wedge, as shown in Fig. 1.48.
Fig. 1.46 	Airfoil shock wave formation.
A REVIEW OF BASIC AERODYNAMICS 	41

-- 57 of 650 --

Because the pressure behind the oblique shock wave is higher than the free-
stream pressure ( p1), an adverse pressure gradient exists that can result in
flow separation and additive drag (wave drag). In summary, the airfoil drag
coefficient now consists of three contributors: skin friction drag (C d f ), pressure
drag (C dp ), and wave drag (Cd w ).
C d ¼ C df þ Cd p þ C dw 	ð1:23Þ
Finally, what happens to the moment about the aerodynamic center as Mach
number increases? As you might expect, the coefficient will typically change
in the transonic region. The most important Mach effect, however, is the fact
that the location of the aerodynamic center shifts from roughly the quarter-
chord to the mid-chord as supersonic Mach numbers are achieved. As we’ll
see later, this shift has a tremendous effect on pitch stability.
1.4 	Finite Wings
To this point, we have only addressed airfoils, or infinite span wings.
Before we attack a complete airplane, this section introduces the aerodynamics
associated with wing tips and finite span wings. First, however, we will define
some terms used to describe a wing’s geometry.
Fig. 1.47 	Variation of airfoil drag coefficient with Mach number.
Fig. 1.48 	Supersonic flow over a wedge.
42 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 58 of 650 --

1.4.1 	Finite Wing Geometry
In our discussion of force and moment coefficients we introduced wing area
(S) and span (b). Figure 1.49 (top view of a finite wing) shows these again.
The following are some other useful definitions:
1) A wing’s aspect ratio (AR) is defined in Eq. (1.24). It is dimensionless.
AR ¼ b2=S 	ð1:24Þ
2) The root chord (cr) and the tip chord (c t ) are the distances of the chord line
at the root and tip, respectively. The ratio of the tip to root chord is called
the taper ratio, l.
l ¼ c t
c r
ð1:25Þ
A rectangular wing has no taper; a delta wing approaches a taper ratio of
zero.
3) A wing’s sweep angle is often defined at the leading edge (LLE ), the
quarter-chord (Lc=4 ), or the mid-chord (Lc=2 ).
4) A wing’s mean aerodynamic chord (MAC), or cc, is defined as
cc ¼ MAC ¼ 2
S
ðb=2
0
c2dy
where y is as shown in Fig. 1.49 and c is the chord at any y position.
The MAC can be interpreted as the representative chord length for the
forces and moments acting on a wing. For a straight, tapered wing, the
MAC can be shown to be
cc ¼ 2
3 c r
l2 þ l þ 1
l þ 1
!
Fig. 1.49 	Finite wing geometry.
A REVIEW OF BASIC AERODYNAMICS 	43

-- 59 of 650 --

1.4.2 	Induced Drag
Induced drag is the penalty paid for generating lift on a finite wing.
Consider a finite wing as shown on the T-38 aircraft in Fig. 1.50.
A wing generates lift by creating a pressure differential between the upper
and lower surfaces. Wing tip vortices are generated as the high-pressure air on
the lower wing surface near the wing tip seeks the relatively lower pressure on
the upper surface. These small ‘‘tornadoes’’ induce a downward component of
velocity, called downwash (w). The freestream velocity is displaced through
the induced angle of attack (ai), as shown in Fig. 1.51.
The wing ‘‘sees’’ Vlocal . Figure 1.52 shows a wing’s cross section. L0 is the
component of the aerodynamic force perpendicular to the local velocity. In
effect, the lift vector has been rotated aft—a new form of drag, induced drag
(Di), is introduced.
Fig. 1.50 	Generation of wing tip vorticies and downwash.
Fig. 1.52 	Induced drag description.
Fig. 1.51 	Induced angle of attack.
44 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 60 of 650 --

The wing effectively ‘‘sees’’ a lower angle of attack, aeff . Therefore, less lift
is generated. Deriving an equation for induced drag is relatively easy (for
example, see Ref. 11). The result is presented (Note: A D subscript is used to
distinguish this from airfoil drag):
D i ¼ C Di qq1S 	ð1:26Þ
where
CD i ¼ C2
L
peAR ð1:27Þ
A few important points about [Eqs. (1.26) and (1.27)]
1) The span efficiency factor is e. A value of 1.0 is optimum and applies for
the case of constant downwash along the wing’s span (obtained from an
elliptical lift distribution). For other planforms the efficiency is less,
typically ranging between 0.95 and 1.0.
2) A high aspect ratio wing reduces induced drag. For this reason, high aspect
ratio wings are used on the U-2 reconnaissance aircraft and gliders.
3) Induced drag is proportional to the lift coefficient, squared. Therefore, at
high angles of attack (high lift), induced drag dominates. High lift implies
greater pressure differentials, thus stronger vortices, and thus more induced
drag.
1.4.3 	Drag Summary
Finite wing geometry (wing tips) introduces a fourth form of drag—induced
drag. Skin friction drag, pressure drag, and wave drag (if above the drag diver-
gence Mach number) still exist. In summary, the drag coefficient for a finite
wing is written as:
C D ¼ C d þ C2
L
peAR ð1:28Þ
where
C d ¼ Cd f þ C dp	
|fflfflfflfflfflffl{zfflfflfflfflfflffl}
profile drag
þCd w
This information is typically presented graphically as a drag polar, as shown in
Fig. 1.53 (again, capital subscripts distinguish this from airfoil data). Note the
effect of decreasing aspect ratio.
1.4.4 	Lift Coefficient for a Finite Wing
We modified airfoil drag (C d ) data to account for the effect of wing tips.
Similarly, this section describes how airfoil data are used to predict the lift
coefficient for a finite wing. Qualitatively, the effect of aspect ratio on the
lift curve slope is shown in Fig. 1.54, where CL is used to denote a finite wing
lift coefficient.
A REVIEW OF BASIC AERODYNAMICS 	45

-- 61 of 650 --

Note the following
1) As aspect ratio decreases, the lift-curve slope (CLa ) decreases. For the same
angle of attack, the lift coefficient is smaller for the finite wing.
2) The zero lift angle of attack (aL¼0 ) does not change. Because the wing is
not generating lift, wing-tip vortices are not formed. In effect, the finite and
infinite cases behave the same.
3) Given an angle of attack, the lift coefficient for the finite wing can be
calculated from the following equation, which takes into account a reduced
lift-curve slope:
CL ¼ CLa ða  aL¼0Þ 	ð1:29Þ
Fig. 1.53 	Effect of aspect ratio on the drag polar.
Fig. 1.54 	Lift curves for infinite and finite wings.
46 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 62 of 650 --

where
CLa ¼ C la
1 þ 57:3Cla
peAR
ð1:30Þ
Again, a capital L (CL) distinguishes this lift coefficient from that of an airfoil.
As mentioned, the zero lift angle of attack can be obtained from airfoil data.
As we have seen, the lift curve slope for an airfoil (C la ) is approximately
0.11=deg. Unless otherwise specified, this is a reasonable number to use in
Eq. (1.30).
Example 1.11
An unswept flying wing has an aspect ratio of 10 and incorporates a NACA
4412 airfoil (as in Example 1.10). For a Reynolds number of 6  10 6 and a
span efficiency factor of 0.95, find C L and C D at an angle of attack of 4 deg.
Using the NACA 4412 airfoil charts in Example 1.10, we find
Cl ¼ 0:85 	and 	aL¼0 ¼ 4 deg
for the stated angle of attack and Reynolds number. The airfoil drag coefficient
is
C d ¼ 0:0065
We next find C La for the finite wing using Eq. (1.30) and a Cla ¼ 0:11=deg.
CLa ¼ Cla
1 þ 57:3Cla
peAR
¼ 0:11
1 þ 57:3ð0:11Þ
ð3:14Þð0:95Þð10Þ
¼ 0:0908=deg
Equation (1.29) is used to determine C L.
CL ¼ C La ða  aL¼0Þ ¼ 0:0908½4 deg  ð4 degÞ ¼ 0:7264
CD is determined from Eq. (1.28).
C D ¼ C d þ C2
L
peAR ¼ 0:0065 þ ð0:7264Þ2
ð3:14Þð0:95Þð10Þ ¼ 0:0242
Notice that the lift coefficient decreases for a finite wing and that the drag
coefficient increases.
1.5 	Aircraft Aerodynamics
We have discussed the aerodynamics of airfoils and finite wings. It is now
time to use this essential background to introduce aircraft aerodynamics. Here
A REVIEW OF BASIC AERODYNAMICS 	47

-- 63 of 650 --

we will be discussing the aerodynamics of the entire aircraft, including the
wing, tail surfaces, and fuselage.
1.5.1 	Load Factor, Aerodynamic Coefficients, and Stall Airspeed
To begin, we will define load factor (n), or cockpit g where n is the ratio of
an aircraft’s lift to its weight, or
n ¼ L=W 	ð1:31Þ
For example: at 2 g, an aircraft is generating an amount of lift equal to twice
its weight.
The lift and drag coefficients for a complete aircraft are defined below,
where lift is replaced by nW to keep the equation in its more general form.
CL ¼ L
qqS ¼ nW
qqS
C D ¼ D
qqS
ð1:32Þ
Lift and drag include the contributions from not only the wing, but also the
fuselage, horizontal=vertical tail, strakes, and external stores. The reference
area, S, now typically includes a portion of the fuselage as shown in Fig. 1.55.
The slowest speed an airplane can fly in straight, level, and unaccelerated
flight is called the stall speed (Vstall ). For these flight conditions, lift is equal to
weight (n ¼ 1). The equation for stall speed is derived as follows:
L ¼ W ¼ C L qqS
¼ C L
1
2 rV 2S
Solving for velocity
V ¼
ffiffiffiffiffiffiffiffiffiffiffi
2W
rSC L
s
ð1:33Þ
Fig. 1.55 	Illustration of aircraft wing reference area.
48 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 64 of 650 --

At stall, C L becomes equal to CLmax .
Vstall ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2W
rSC Lmax
s
ð1:34Þ
CLmax is the maximum lift coefficient for the aircraft’s configuration. In the
above form, the stall speed is a ‘‘true airspeed.’’ As altitude increases, density
decreases, and an aircraft stalls at a higher true airspeed—not very convenient
in terms of flight operations. In Chapter 3, we’ll introduce other airspeeds
(indicated, calibrated, etc.) and see how to avoid this inconvenience.
Example 1.12
Determine the stall airspeed at sea level for a 10,000-lb T-38 with 20-deg
flaps. The wing reference area is 170 ft 2 . Also, determine the load factor if the
same aircraft is at an angle of attack of 10 deg with the flaps up at sea level
with an airspeed of 265 kn. Use the following chart.
(Source: Department of Aeronautics, USAF Academy)
A REVIEW OF BASIC AERODYNAMICS 	49

-- 65 of 650 --

To determine the stall speed, we first determine C Lmax for 20-deg flaps from
the chart.
CLmax ¼ 0:88
Then, Eq. (1.34) can be used to find the stall speed.
Vstall ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2W
rSC Lmax
s
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2ð10;000Þ
ð0:00238Þð170Þð0:88Þ
s
¼ 237 ft=s
To find the load factor, the lift coefficient for an angle of attack of 10 deg
(flaps up) is found from the chart.
CL ¼ 0:67
Then, Eq. (1.32) is solved for load factor.
n ¼ CL qqS
W ¼
ð0:67Þ 1
2 ð0:00238Þ 265  1:69 ft=s
kn
 	2 !
ð170Þ
10;000 ¼ 2:72
At these conditions, the T-38 is pulling 2.72 g.
1.5.2 	Aircraft Drag Polar
Typically, the aerodynamics of an airplane are presented as a drag polar—
this is in the form of an equation, a graph, or both. Recall from the airfoil and
finite wing discussions that a drag polar (by definition) shows the relationship
between lift and drag coefficients for a specific aerodynamic body. In equation
form, the drag polar of an aircraft is
CD ¼ CD0 þ C2
L
peAR ð1:35Þ
or simply
CD ¼ CD0 þ KC2
L 	ð1:36Þ
CD0 is called the parasite drag coefficient or zero lift drag coefficient. Below
the drag divergence Mach number, it is approximated by a constant (indepen-
dent of lift) for a specific aircraft configuration. Included in this term are
profile drag (skin friction and zero lift pressure drag) and interference drag.
Interference drag is generated when more than one body (for example, stores
on a wing) is placed in the same flowfield, creating eddies, turbulence, and=or
restrictions to smooth flow. For example, if an external store is hung on a
wing, the combined drag will typically be more than the summation of the
50 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 66 of 650 --

individual store and wing drag. Occasionally, the addition of blended surfaces,
as in the case of the F-15 conformal fuel tanks, will reduce the interference
drag.
The term C2
L=peAR in Eq. (1.35) is the drag due to lift, or induced drag
term and is sometimes referred to as C Di . The induced drag on all lifting
surfaces (wing, strakes, and horizontal tail) and the increment of pressure drag
when the aircraft is generating lift are included in this term. The term K in Eq.
(1.36) is referred to as the induced drag factor and can be seen to be equal to
1=peAR. If Mach effects are unimportant, K is a constant for a specific config-
uration. The term e is called the Oswald efficiency factor. It can be thought of
as a ‘‘fudge factor,’’ obtained through wind-tunnel and=or flight tests, which
takes into account such effects as a nonelliptical lift distribution and the varia-
tion of pressure drag with lift. Typically, e is on the order of 0.8, but no greater
than 1.0.
It is very convenient to present the drag polar graphically. Typically, this is
done in two ways, as presented in Fig. 1.56.
We have previously seen the parabolic presention of the drag polar. The
second graph is a linear presentation because C D is plotted as a function of
C2
L. This form of the drag polar is convenient for determining the induced drag
factor, K, which is simply the slope of the line. It is also a convenient format
for plotting individual flight test data points when determination of the drag
polar is the end objective. In this format, a linear curve fit to the data is
supported by theory.
Mach effects are typically defined through the values of C D0 and K. For
example, Table 1.2 illustrates how these ‘‘constants’’ change for the F-16.
Another useful measure of drag used by aircrews is the drag count. A drag
count is defined as one ten thousandth of a drag coefficient, or
1 drag count ) a C D of 0:0001
The drag count is simply a ‘‘user friendly’’ way to express the drag coefficient.
A C D of 0.025 is equivalent to 250 drag counts. Drag counts are especially
useful when adding external protuberances to an aircraft. For example, the
addition of a forward radome on the AC-130H gunship adds approximately 23
drag counts to the total aircraft drag. This is equivalent to a drag coefficient
Fig. 1.56 	Two ways of presenting the drag polar.
A REVIEW OF BASIC AERODYNAMICS 	51

-- 67 of 650 --

increase of 0.0023, but 23 drag counts proves to be an easier number to
remember.
Example 1.13
Using Table 1.2, find the total drag counts for the F-16 at a lift coefficient
of 0.2 and Mach 0.86.
From Table 1.2, we have,
CD0 ¼ 0:0169 	and 	K ¼ 0:117
Using Eq. (1.36),
C D ¼ CD0 þ KC2
L ¼ 0:0169 þ ð0:117Þð0:2Þ2 ¼ 0:02158
For this condition, the aircraft would have 215.8 drag counts.
1.5.3 	Total Aircraft Drag
The total drag on an aircraft is simply
D ¼ CD qqS
It is useful to factor out velocity (V1) in the previous equation, as shown:
D ¼ ½C D0 þ KC2
L 1
2 rV 2S
Substituting in
C L ¼ nW
qqS ¼ nW
1
2 rV 2S
Table 1.2 	Variation of C D0 and K with
Mach number for the F-16 (Ref. 2)
Mach 	C D0 	K
0.1 	0.0169 	0.117
0.86 	0.0169 	0.117
1.05 	0.0430 	0.128
1.5 	0.0382 	0.252
2.0 	0.0358 	0.367
52 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 68 of 650 --

We have
D ¼ 	C D0
1
2 rS
 	
parasite drag
V 2 þ 2KðnW Þ2
rS
" 	#
induced drag
1
V 2 	ð1:37Þ
From Eq. (1.37), it is clear that parasite drag is proportional to the square of
velocity. Induced drag behaves as the inverse of velocity squared. Qualitatively,
this is shown in Fig. 1.57. The total drag is the sum of parasite and induced
drag. From Eq. (1.37), it can be seen that changes in altitude (r), load factor
(n), configuration (CD0 ; S, and K), and=or weight will affect an aircraft’s total
drag. Reference 12 illustrates these effects.
We will see that the drag vs velocity curve is very important in defining
and optimizing aircraft performance characteristics such as range and endur-
ance.
1.6 	Historical Snapshot—The AC-130H Drag Reduction Effort
In 1998, wind tunnel research was begun at the Air Force Academy Aero-
nautics Laboratory to investigate drag reduction approaches for the AC-130H
Gunship. 13 The AC-130H is a C-130 aircraft modified with a 40-mm Bofors
cannon and a 105-mm Howitzer that fire out the left side of the aircraft, along
with a full complement of offensive and defensive avionics. The aircraft is
capable of performing various missions such as close air support and air inter-
diction. A picture of an AC-130H is presented in Fig. 1.58.
The numerous external protuberances required by these missions resulted in
a high level of drag on the AC-130H when compared to the standard C-130.
The primary focus of the drag reduction effort was to increase the aircraft’s
ceiling, range, and loiter time, and to decrease fuel consumption. The primary
objectives of this research included
1) determining the added drag counts of 14 external protuberances on the
AC-130H using a 1=48th scale wind tunnel model;
Fig. 1.57 	Typical drag vs velocity curve for an aircraft.
A REVIEW OF BASIC AERODYNAMICS 	53

-- 69 of 650 --

2) designing and evaluating drag reduction modifications that could be easily
installed and would not reduce the aircraft’s operational capability; and
3) projecting the operational impact of identified drag reduction modifications
in terms of loiter time, range, fuel savings, and ceiling.
To accomplish these objectives, wind tunnel testing was accomplished on a
variety of configurations and modifications using the Air Force Academy Sub-
sonic Wind Tunnel. A picture of this closed circuit wind tunnel is presented in
Fig. 1.59.
The 1=48th scale test model is shown mounted in the tunnel test section in
Fig. 1.60.
Drag coefficients resulting from the research were converted to drag counts
to make accurate comparisons and effective operational projections. The
program identified a maximum drag reduction potential of 53 drag counts
based on incorporation of nine recommended modifications. This translated to
a reduction in the parasite drag coefficient, C D0 , of 0.0053. Because the para-
site drag coefficient of a clean C-130 was approximately 0.03 as compared to
the AC-130H CD0 of 0.045, the identified drag reduction potential represented
approximately 35 percent of the added incremental drag (0.015) associated
with gunship modifications. To put this in perspective, the parasite drag portion
of the aircraft total drag curve as illustrated in Fig. 1.57 would be lowered by
35 percent which has important implications for aircraft performance improve-
ment. A performance simulation program projected a 1730-ft increase in ceil-
ing, and either a fuel savings of 1483 lb, a mission radius increase of 53
nautical miles, or a loiter time increase of 52 min for a 5-h combat mission.
Fig. 1.58 	AC-130H Gunship.
54 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 70 of 650 --

These were significant improvements in combat capability resulting from a
reduction in parasite drag.
References
1 Anderson, J. D., Introduction to Flight, 3rd ed., McGraw-Hill, New York, 1989,
p. 51.
2 Brandt, S. A., Stiles, R. J., Bertin, J. J., and Whitford, R., Introduction to Aeronautics: A
Design Perspective, AIAA Education Series, AIAA, Reston, VA, 1997, pp. 52–53.
3 Anderson, J. D., Fundamentals of Aerodynamics, McGraw-Hill, New York, 1984, pp.
318–323.
Fig. 1.59 	U.S. Air Force Academy subsonic wind tunnel.
Fig. 1.60 	AC-130 wind tunnel model.
A REVIEW OF BASIC AERODYNAMICS 	55

-- 71 of 650 --

4 Anderson, J. D, Hypersonic and High Temperature Gas Dynamics, McGraw–Hill,
New York, pp. 13–30.
5 Brandt, S. A., Stiles, R. J., Bertin, J. J., and Whitford, R., Introduction to Aeronautics: A
Design Perspective, AIAA Education Series, AIAA, Reston, VA, 1997, pp. 40–45.
6 Moore, F. G., Hymer, T., and Wilcox, F. J., Jr., ‘‘Improved Empirical Model for Base
Drag Prediction on Missile Configurations Based on New Wind Tunnel Data,’’ Naval
Surface Warfare Center, Dahlgren Division, TR 92-509, Oct. 1992.
7 Abbott, I. H., and Von Doenhoff, A. E., Theory of Wing Sections, Dover Publications,
Inc., New York, 1959.
8 Anderson, J. D., Introduction to Flight, 3rd ed., McGraw–Hill, New York, 1989,
pp. 182–185.
9 Anderson, J. D., Fundamentals of Aerodynamics, McGraw–Hill, New York, 1984, pp.
305–375.
10 Lan, C. E., and Roskam, J., Airplane Aerodynamics and Performance, Roskam
Aviation and Engineering Corporation, Ottawa, KS, 1988.
11 Anderson, J. D., Introduction to Flight, 3rd ed., McGraw Hill, New York, 1989, pp.
222–225.
12 Brandt, S. A., Stiles, R. J., Bertin, J. J., and Whitford, R., Introduction to Aeronautics:
A Design Perspective, AIAA Education Series, AIAA, Reston, VA, 1997, p. 172.
13 Yechout, T. R., Chadsey, D. S., and Rutgers, N. G., ‘‘Identification of AC-130H Drag
Reduction Potential Using a 1=48th Scale Wind Tunnel Model and Prediction of Resulting
Performance Enhancements,’’ U.S. Air Force Academy Dept. of Aeronautics TR 00-02,
Aug. 2000.
Problems
1.1 	Define the pressure, density, and temperature ratios. Based on these ratios
and the Perfect Gas Law derive an expression for density ratio (s) in
terms of pressure ratio (d) and temperature ratio (y).
1.2 	A flight test engineer wants to obtain drag data at an ambient pressure of
1000 psf . (Use definitions of s; d, and y. Interpolate to check your
answer.)
(a) 	At what altitude should the aircraft fly?
(b) 	What type of altitude is this?
(c) 	The weather report shows the temperature is 15C at this altitude.
Is it hotter or colder than standard and by how many degrees?
(d) 	What is the aircraft density altitude at these conditions?
1.3 	An aircraft is flying at 88 ft=s at sea level on a standard day. Find the
velocity at a point on the wing where the static pressure is 2070 psf .
1.4 	An aircraft is flying at a velocity of 50 m=s at an altitude of 5 km on a
standard day. At one point on the wing, the local velocity is 70 m=s. Find
the freestream dynamic pressure, the flowfield total pressure, and the
local static pressure at the point where the velocity is 70 m=s.
56 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 72 of 650 --

1.5 	Sketch a typical C L vs angle of attack curve and a CD vs C L curve for
AR ¼ 1. Show how the curves would change for an AR of 10 and 5.
1.6 	Given a span efficiency of 0.95 and an aspect ratio of 10, find the three-
dimensional lift curve slope (C La ) and the slope of the C D vs C2
L curve
(K).
1.7 	The Fairchild Republic A-10 with the following characteristics is in level
unaccelerated flight.
CD0 ¼ 0:032 	S ¼ 506 ft 2 	W ¼ 23;200 lb
AR ¼ 6:5 	e ¼ 0:87 	CLmax ¼ 2:0
Max TSL ¼ 9060 lb ðeach engineÞ
(a) 	Write the drag polar equation for the A-10 at this flight condition.
(b) 	Find the stall velocity in knots at sea level.
(c) 	What are the lift and drag of the A-10 at 300 knots at sea level?
A REVIEW OF BASIC AERODYNAMICS 	57

-- 73 of 650 --

This page intentionally left blank

-- 74 of 650 --

2
A Review of Basic Propulsion
To sustain flight for any appreciable amount of time, aircraft need some
type of propulsion system. The purpose of the propulsion system is to produce
a controllable force called thrust, which is made to act in concert with the
other forces on the aircraft (lift, drag, and weight) to produce the desired trans-
lational motion. In most cases thrust is used to accelerate the aircraft along the
flight path and to counteract drag; however, it is certainly possible for thrust to
be used in other ways such as to augment lift (for example, V-STOL aircraft
like the AV-8A Harrier).
2.1 	Types of Propulsion Systems
A number of different propulsion choices exist for the aircraft designer.
This section provides a brief overview of different propulsion systems and their
advantages and disadvantages.
2.1.1 	Piston–Propeller
The piston (or reciprocating) engine–propeller combination is probably the
most efficient propulsion system for low-speed aircraft (Fig. 2.1). This is true
because the propeller produces thrust by increasing the momentum of a rela-
tively large amount of air. Also, the reciprocating engine is efficient in terms
of fuel consumption. Fuel consumption is usually expressed as pounds of fuel
per hour per brake horsepower and given the name of brake-specific fuel con-
sumption (BSFC). Typical values of BSFC for aircraft reciprocating engines in
use today are 0.4 to 0.5 lb=bhp-h for cruise power. At flight speeds above
approximately Mach 0.3, the efficiency of the propeller starts to drop off
because of compressibility effects on the blades. The engine size necessary to
produce the required thrust makes other propulsion systems more attractive at
this point.
2.1.2 	Turboprop
A turboprop propulsion system uses a gas turbine engine instead of a reci-
procating engine to power the propeller. A typical layout is shown in Fig. 2.2.
As air enters the engine, it is compressed somewhat by the ram effect of air
hitting the engine and being slowed down in the inlet. Most of the compression
is done in the compressor. Fuel is added and the mixture is burned in the
combustor. The hot gases are expelled to turn one turbine to drive the
compressor, and another turbine to drive the propeller. Because the turbine
speed is on the order of 16,000 rpm, a reduction gear is necessary to run the
59

-- 75 of 650 --

propeller. The thermodynamic cycle on which the engine operates is known as
the Brayton cycle. Specific fuel consumption (SFC), similar to BSFC for reci-
procating engines, is expressed as pounds of fuel per hour per equivalent shaft
horsepower (ESHP). ESHP is the shaft power delivered to the propeller plus
effective power of any additional thrust produced by the exhaust gases. Cruise
SFC for modern turboprop engines is in the neighborhood of 0.6 lb=eshp-hr.
The extremely large airflow through the gas turbine engine, when compared to
that of the reciprocating engine, gives it a much larger power-to-weight ratio.
Also, the power output capability of a turboprop increases somewhat with
flight velocity because of the ram effect experienced by the air. These two
factors increase the efficiency of the system up to flight speeds of approxi-
mately Mach 0.6.
2.1.3 	Turbojet
A turbojet is a gas turbine engine in which all of the thrust is produced by
the exit velocity of the exhaust gas. Only the power necessary to drive the
compressor (and a small amount to drive aircraft accessories, such as genera-
tors and hydraulic pumps) is extracted from the turbine. Figure 2.3 shows a
Fig. 2.1 	Piston–propeller.
Fig. 2.2 	Turboprop.
60 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 76 of 650 --

typical turbojet. After leaving the turbine section, the high-pressure exhaust
gases are accelerated through the nozzle and exit the engine close to atmo-
spheric pressure. The thermodynamic cycle for a turbojet is a modified Brayton
cycle.
The most significant turbojet engine design criterion that limits the thrust
output (other than size) is the maximum allowable turbine inlet temperature.
The higher this temperature can be, the more energy that can be added to the
air, which means more energy is available to provide thrust after driving the
turbine. The maximum turbine inlet temperature depends on the material char-
acteristics of the turbine and whether or not blade cooling is used. A typical
value for maximum turbine inlet temperature is approximately 2000F for
current high performance turbojets.
Fuel consumption for turbojet engines is referenced to thrust produced
instead of power produced and is called thrust-specific fuel consumption
(TSFC). It is usually expressed in pounds of fuel per hour per pound of thrust.
Typical values for a turbojet are usually in the neighborhood of 1.0 =h. Indivi-
dual engine component efficiencies and the compressor pressure ratio have a
major effect on the overall engine efficiency. Higher values of compressor pres-
sure ratio generally yield a greater efficiency. Typically this ratio varies from
5:1 to 15:1.
2.1.4 	Turbojet with Afterburner
In supersonic high-performance aircraft, turbojets are usually augmented
with afterburners. Figure 2.4 shows a schematic of this type of engine. Note
the only difference between this engine and Fig. 2.3 is the addition of a long
afterburner duct. After air passes through the turbine, additional fuel can be
selectively added and burned in the afterburner duct. The maximum allowable
temperatures are significantly higher than the maximum turbine inlet tempera-
ture, and as a result, a thrust increase of more than 50% is common for after-
burner use. A variable area nozzle is necessary because of the differences in
the volume of airflow, depending on whether or not the afterburner is in opera-
tion, as the exhaust gas is expanded to atmospheric pressure. Afterburner
Fig. 2.3 	Turbojet engine.
A REVIEW OF BASIC PROPULSION 	61

-- 77 of 650 --

operation causes a loss in efficiency, bringing the TSFC up to approximately
2.0 =hr. The turbojet, augmented as necessary by afterburning, serves most effi-
ciently in the Mach 1.0–2.5 range.
2.1.5 	Turbofan
Spanning the speed regime between the turboprop and turbojet, the turbofan
provides the most efficient available propulsion. As expected, the turbofan can
be considered a cross between the ducted turboprop and a turbojet. Figure 2.5
provides a schematic of a typical turbofan engine. Figure 2.5(a) illustrates a
low-bypass ratio turbofan and Fig. 2.5(b) shows a high-bypass ratio turbofan.
A percentage of the air passes through the fan only and is expelled, provid-
ing some thrust. This is called the secondary or fan airflow. The rest of the air,
called the primary or core airflow, passes through the entire engine as in the
conventional turbojet. The ratio of the secondary mass flow rate to the primary
mass flow rate is called the engine bypass ratio (BPR) and is essentially
constant for a given engine.
Turbofans begin to lose their efficiency advantage over turbojets when
approaching sonic flight velocity because of their relatively large frontal area.
The actual velocity at which this occurs depends largely on the engine BPR, as
might be expected. The TF-39 has a BPR of approximately 8:1 and powers
the C-5, which cruises around Mach 0.8. The F-100 engine has a BPR of less
than one and powers the F-15 and F-16, whose missions require velocity
capabilities well into the supersonic region.
Fuel consumption of turbofans is measured by TSFC, just as with turbojets.
It generally runs approximately 0.5 =h for cruise conditions, although it can
vary significantly depending on the BPR. For example, TSFC for the TF-39 is
approximately 0.4 =h for normal cruise, where TSFC for the F-100 is close to
0.7 =h with afterburner.
2.1.6 	Ramjet
At high flight velocities the air hitting the engine intake produces enough
compression for engine operation without having to power an active compres-
Fig. 2.4 	Turbojet with afterburner.
62 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 78 of 650 --

sor. This enables the ramjet to operate without any moving parts. As shown in
Fig. 2.6, a turbine is not necessary because there is no compressor. These
engines have the advantage of being very simple. The obvious drawback is
that they must have sufficient flight velocity before they can produce thrust.
For this reason, they are used mainly on missiles augmented with rocket
engines. As far as efficiency is concerned, ramjets begin to surpass afterburn-
ing turbojets at flight speeds of approximately Mach 3 with TSFCs in the
neighborhood of 3 =h.
Fig. 2.5 	Turbofan bypass ratio diagrams.
Fig. 2.6 	Ramjet.
A REVIEW OF BASIC PROPULSION 	63

-- 79 of 650 --

Figure 2.7 gives a qualitative summary of propulsion systems discussed in
this section.
Notice that there is considerable overlap in the altitude–airspeed envelopes
for these different propulsion systems, but Fig. 2.7 gives a general idea of the
specific areas of use.
2.2 	Propulsion System Characteristics
Propulsion system characteristics can be predicted using a variety of meth-
ods. This text will present a simplified approach using the thrust equation and
corrected properties. These approaches are usually sufficient for analysis of
flight mechanics characteristics. Of course, more sophisticated approaches,
such as an engine contractor’s prediction program, can be used if these
resources are available and more accuracy is needed.
2.2.1 	Thrust Equation
In understanding how an aircraft performs it is essential to develop the
aircraft thrust equation. To accomplish this, the engine can be modeled as a
control volume. The net force acting on the control volume can be thought of
as two separate forces. There is a force because of the change of velocity
(linear momentum) through the control volume, and there may be a differential
pressure force. Figure 2.8 shows a simple schematic of an engine. The thrust
force can be quantified by an application of Newton’s 2nd law. Newton’s 2nd
law in vector equation form is
S FF ¼ dðm VV Þ
dt ð2:1Þ
Fig. 2.7 	Operating regimes.
64 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 80 of 650 --

The force exerted on the flow is in the same direction as the change of
momentum. Therefore, the force exerted on the flow in Fig. 2.8 acts to the
right assuming that Ve > V1. Newton’s 3rd law states that for every action
there is an equal and opposite reaction. In the analysis of a propulsion system,
this reaction is the thrust force. Because the force on the flow is to the right
(that is, force is exerted to speed the flow up), the thrust force (the equal and
opposite force on the propulsion system) acts to the left in Fig. 2.8. Assuming
steady, one-dimensional flow at the entrance and exit of the control volume,
the difference in linear momentum at the entrance and exit is represented by
the force equation:
S FF ¼ dðm VV Þ
dt ¼ _m	m e VV e  _m	m1 VV1 ¼  FFn 	ð2:2Þ
where
_m	m1 ¼ r1AV1 ðmass flow rate of air going into the engineÞ
_m	m e ¼ _m	m1 þ _m	m f ðmass flow rate at the exitÞ
_m	m f ¼ the mass flow rate of the fuel
VVe ¼ the nozzle exit velocity
VV1 ¼ the freestream velocity entering the engine
The second force acting on the propulsion system is because of the differential
pressures at the entrance and exit, assuming that the entrance and exit areas are
parallel to each other. Therefore, the net pressure force ( FFp) perpendicular to
the areas in vector form is
FF p ¼ p e AAenorm  p1 AAinorm 	ð2:3Þ
Fig. 2.8 	Net thrust schematic.
A REVIEW OF BASIC PROPULSION 	65

-- 81 of 650 --

where
AA enorm ¼ the area of the nozzle exit perpendicular to the engine centerline
AAinorm ¼ the area of the inlet perpendicular to the engine centerline
The total net thrust, Fn, expressed in vector form is therefore
FFn ¼ ð _m	m e VV e  _m	m1 VV1 Þ þ p e AAenorm  p1 AA inorm 	ð2:4Þ
or
FFn ¼ ½ð _m	m1 þ _m	m f Þ VVe  _m	m1 VV1  þ p e AA enorm  p1 AAinorm 	ð2:5Þ
The equation can be further simplified by making several additional assump-
tions. First, the mass flow rate of the air is assumed to be significantly greater
than the mass flow rate of the fuel (that is, _m	m1  _m	m f ). Therefore, the mass
flow rate of the fuel will be neglected (that is, _m	mf ffi 0). Second, it is also
assumed that freestream velocity vector is parallel to the nozzle exit velocity
vector (namely, ½a þ fT  0). Third, the area of the inlet and area of the
nozzle are assumed to act perpendicular to the freestream velocity. Finally, the
areas of the inlet and nozzle are assumed to be approximately equal (Ae  A i).
Pictorially, this is shown in Fig. 2.9.
These assumptions make the thrust vector equation into a scalar equation as
shown:
Fn ¼ _m	m1V e  _m	m1V1 þ p e Ae  p1A e 	ð2:6Þ
or
F n ¼ _m	m1Ve  _m	m1V1 þ ð p e  p1 ÞAe 	ð2:7Þ
If the nozzle is assumed to be operating on design, then pe ¼ p1 and the
thrust equation simplifies to
Fn ¼ _m	m1Ve  _m	m1V1 	ð2:8Þ
Fig. 2.9 	Thrust schematic after assumptions.
66 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 82 of 650 --

This is by no means accurate enough for detailed jet engine analysis and thrust
calculations, but it serves as an approximation for determining net thrust pro-
vided the engine is operating close to its design point.
The first term, _m	m1V e, is the gross thrust, Fg, of the engine. F g becomes the
static thrust at V1 ¼ 0. Therefore, data collected on a static test stand yields
the gross thrust of an engine. Engine manufacturers provide data on an engine
in terms of this static thrust, usually presented for standard sea-level condi-
tions.
The second term,  _m	m1V1, is known as the ram drag, F e (namely,
Fe ¼ _m	m1V1). Therefore,
F n ¼ Fg  _m	m1V1 	ð2:9Þ
Ram drag is not usually discussed in propulsion courses. Ram drag is the force
resulting from the change of linear momentum in bringing the flow from the
freestream velocity to a velocity near zero in the inlet. Recall the purpose of
an inlet to slow the velocity to near zero at the compressor face, which in turn
increases the pressure. This force opposes the gross thrust, so it causes the net
thrust to be less.
Typically, ram drag dominates in the incompressible flow regime at
M < 0:3. As the freestream velocity increases in this regime, _m	m1 increases in
both the gross thrust and ram drag term. However, V1 is also present in the
ram drag term, causing that term to increase more. As a result, the net thrust
initially decreases with increasing velocity as shown in Fig. 2.10. In the
compressible flow regime (M > 0:3) ram effect, or ram recovery, is important.
In this regime there is an increase in the density and pressure as the velocity is
slowed down in the inlet because of compressibility effects. This higher pres-
sure at the compressor face results in a larger gross thrust that increases faster
than the rise in ram drag. As a result, there is an increase in the net thrust with
increasing velocities at the higher Mach numbers, as shown in Fig. 2.10.
2.2.2 	Functional Relationship of Thrust
The net thrust of the engine depends on a number of parameters. These
include r1, p1, T1, V1, _m	m1, N , and D, where N is engine rpm based on
Fig. 2.10 	Ram drag and ram effect for nonafterburning turbojet.
A REVIEW OF BASIC PROPULSION 	67

-- 83 of 650 --

throttle setting and D is the engine diameter. The number of variables can be
reduced because p1 and T1 fixes the value of r1. These parameters also
make up mass flow rate. Therefore,
Fn ¼ f ð p1; T1; V1; N ; DÞ 	ð2:10Þ
As a result, the presentation of thrust data for an engine must reflect the condi-
tions at which the data were obtained. Often, data are presented for an aircraft
in thrust curves for a specific rpm setting and a given altitude based on stan-
dard conditions, such as the T-38 data shown in Fig. 2.11. Note that the plot
yields the net thrust as a function of Mach number for military power (100%
rpm) and maximum power (100% rpm with afterburner) at standard sea-level
conditions. This provides valuable information but does not tell what happens
if the aircraft is operating at any other throttle setting or a flight condition
other than standard sea-level values at that altitude. Therefore, an infinite
number of plots would be required to characterize the thrust performance at all
possible flight conditions. An alternate, and very useful, method of presenting
thrust information involves the use of corrected properties in conjunction with
the net thrust equation in Eq. (2.10).
2.2.3 	Corrected Properties
Dimensional analysis shows, and is verified by experimental results, that the
number of variables can be greatly reduced by using corrected properties. The
primary corrected properties used are corrected gross thrust, corrected thrust-
specific fuel consumption (TSFC), and corrected airflow, which are usually
defined as a function of corrected rpm and M . These properties depend on the
temperature and pressure ratios (y and d) defined in Eq. (1.7) and are summar-
ized as follows:
N c ¼ Nffiffiffi
y
p 	is corrected rpm
Fg c ¼ Fg
d is corrected gross thrust
_ww f
Fg
ffiffiffi
y
p 	is corrected TSFC based on gross thrust
_ww f
Fn
ffiffiffi
y
p 	is corrected TSFC based on net thrust
_wwair
ffiffiffi
y
p
d is corrected airflow
9
>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	=
>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	>	;
Static Case M1 ¼ 0
ð2:11Þ
68 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 84 of 650 --

Fig. 2.11 	T-38 thrust data.
A REVIEW OF BASIC PROPULSION 	69

-- 85 of 650 --

For the turbojet, the gross thrust, TSFC, and airflow data can be obtained in
static tests (V1 ¼ 0) on a test stand and corrected to standard sea-level condi-
tions for presentation. These corrected data can be plotted on a series of
nominal graphs as shown in Fig. 2.12 that can be used to analyze any possible
operating condition. These graphs are very powerful and can be used to deter-
mine the gross thrust, TSFC, and mass airflow for any atmospheric condition
and throttle setting.
Note that the aforementioned quantities are based on the static case
(V1 ¼ 0). The corrected properties are the same for the in-flight case, V1 > 0,
except that y and d are replaced in the equations with yT and dT, respectively,
where
yT ¼ T o
Tsl
ð2:12Þ
Fig. 2.12 	Corrected properties vs corrected rpm.
70 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 86 of 650 --

and
dT ¼ Po
p sl
ð2:13Þ
Note that the total temperature, To, and the total pressure, p o, are used in yT
and dT , respectively, instead of the static temperature, T, and static pressure, p.
From the isentropic relations, yT and dT are easily found to be
yT ¼ y 1 þ g  1
2 M 2
 	
ð2:14Þ
dT ¼ d 1 þ g  1
2 M 2
 	 g
g1
ð2:15Þ
For the static case (M ¼ 0), y ¼ yT and d ¼ dT , which means the static case is
just a subset of the in-flight case. Therefore, more general forms of the cor-
rected properties are
N c ¼ N
ffiffiffiffiffi
yT
p 	is corrected rpm
F gc ¼ Fg
dT
is corrected gross thrust
_ww f
F g
ffiffiffiffiffi
yT
p 	is corrected TSFC based on gross thrust
_ww f
F n
ffiffiffiffiffi
yT
p 	is corrected TSFC based on net thrust
_wwair
ffiffiffiffiffi
yT
p
dT
is corrected airflow 	ð2:16Þ
For the in-flight case (namely, V1 > 0), these total properties, yT and dT,
replace the static properties, y and d, respectively, on the axes in Fig. 2.12.
Actual data for the J69 engine used in the T-37B aircraft are shown in Figs.
2.13 through 2.15. Figure 2.13 depicts the corrected gross thrust as a function
of corrected rpm. Note that the corrected gross thrust data provided are for a
single engine only; therefore, the results must be multiplied by two to reflect
the two engine T-37B.
Figure 2.14 shows the corrected TSFC as function of corrected rpm for the
J69 engine. Because TSFC is represented in pounds of fuel per hour per
pound of thrust produced, it will have the same value for one engine or two
engines. It is the actual flow rate of the fuel in pounds per hour, _ww f , which
must be doubled for two engines.
Figure 2.15 shows the corrected airflow as function of corrected rpm. Just
as in Fig. 2.13, the data presented are for only one engine and must be multi-
plied by two for the T-37B.
A REVIEW OF BASIC PROPULSION 	71

-- 87 of 650 --

Note that the data are a function of both corrected rpm and Mach number.
For Mach numbers other than those listed, the user must interpolate to estimate
the corrected airflow.
The use of the corrected property plots (Figs. 2.13 through 2.15) is best
illustrated with the following T-37 example.
Example 2.1
A T-37 is cruising at 20,000 ft pressure altitude at 300 kn true airspeed. The
outside air temperature is 20F and the actual engine speed is 18,000 rpm.
Assume that the angle between the ram drag and gross thrust is 180 deg. Deter-
mine the net thrust and the fuel flow rate.
Fig. 2.13 	Corrected gross thrust vs corrected rpm for J69.
72 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 88 of 650 --

Solution: 	Because the aircraft is in flight, the corrected properties must be
determined based on the total temperature ratio and the total pressure ratio
(namely, yT and dT , respectively). To determine these ratios it is first necessary
to determine the Mach number.
M ¼ V
a ¼ V
ffiffiffiffiffiffiffiffiffi
gRT
p 	¼ ð300 knÞð1:689 ft=sec=knÞ
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ð1:4Þð1716 ft  lb=slug   RÞð20F þ 460FÞ
p 	¼ 0:493
y is determined using
y ¼ T
T sl
¼ ð20F þ 460FÞ
518:67R ¼ 0:8483
and d can be read directly from the standard atmosphere table because the
aircraft is operating at a pressure altitude of 20,000 ft.
d ¼ 0:4595
Fig. 2.14 	Corrected TSFC vs corrected rpm for J69.
A REVIEW OF BASIC PROPULSION 	73

-- 89 of 650 --

The total properties are found using the isentropic relations,
yT ¼ y 1 þ g  1
2 M 2
 	
¼ ð0:8483Þ 1 þ ð1:4  1Þ
2 ð0:493Þ2
 	
¼ 0:8895
and
dT ¼ d 1 þ g  1
2 M 2
 	 g
g1
¼ ð0:4595Þ 1 þ ð1:4  1Þ
2 ð0:493Þ2
 	 1:4
1:41
¼ 0:5425
The corrected rpm, Nc, is
Nc ¼ N
ffiffiffiffiffi
yT
p 	¼ 18;000
ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
0:8895
p 	¼ 19;085 rpm
Using Fig. 2.13, the gross corrected thrust, Fg c , is found to be approximately
610 p for one engine. Therefore, the actual gross thrust, Fg, for one engine is
Fig. 2.15 	Corrected airflow vs corrected rpm.
74 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 90 of 650 --

found using Eq. (2.11).
Fg ¼ Fg c dT ¼ ð610 lbf Þð0:5425Þ ¼ 330:9 lbf
Therefore, for both engines
Fg ¼ ð2 enginesÞð330:9 lbf =engineÞ ¼ 661:8 lbf
The net thrust, Fn, is found using Eq. (2.9).
F n ¼ Fg  _m	m1V1
Therefore, it is necessary to determine the mass flow rate of the air through
both engines. The airflow is determined using data in Fig. 2.15. Using the
graph
_wwair
ffiffiffiffiffi
yT
p
dT
 16:8 lb=s
Therefore, the actual airflow for one engine is
_wwair ¼ ð16:8 lb=sÞ dT
ffiffiffiffiffi
yT
p 	¼ ð16:8 lb=sÞ 0:5425
ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
0:8895
p
 	
¼ 9:66 lb=s
which means the airflow for both engines is
_wwair ¼ ð2 enginesÞð9:66 lb=s=engineÞ ¼ 19:32 lb=s
The mass flow rate is found using
_m	m1 ¼ _wwair
g ¼ 19:32 lb=s
32:2 ft=s2 ¼ 0:6 slug=s
Therefore, the net thrust is
F n ¼ F g  _m	m1V1 ¼ 661:8 lb  ð0:6 slug=sÞ½ð300 knÞð1:69 ft=s=knÞ
¼ 357:8 lb
To find the fuel flow rate, _ww f , Fig. 2.14 is used to find the corrected TSFC.
TSFCc ¼ _ww f
Fg
ffiffiffiffiffi
yT
p 	¼ 1:3=h
A REVIEW OF BASIC PROPULSION 	75

-- 91 of 650 --

Therefore,
_wwf ¼ ð1:3=hÞðFg
ffiffiffiffiffi
yT
p Þ ¼ ð1:3=hÞð661:8 lbÞ ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
0:8895
p ¼ 811:4 lb=h
2.2.4 	Summary
The combination of the thrust equation and the use of corrected properties
provide a relatively straightforward method to estimate the thrust produced for
aircraft with simple turbojets, such as the T-37. Similar approaches are avail-
able for the more common turbofans. This approach can be extremely useful in
quickly predicting aircraft performance and capabilities. Complex engines
require more elaborate procedures that are usually supplied by the engine
manufacturer.
2.3 	Historical Snapshot—Aircraft Performance Modeling and
the Learjet Model 35
In the early 1980s, a joint research effort between the National Aeronautics
and Space Administration (NASA) Dryden Research Center and the University
of Kansas Department of Aerospace Engineering developed an efficient
method for defining aircraft and engine characteristics based on a limited
amount of flight test data. 1 The overall method was referred to as performance
modeling and used a combination of acceleration and deceleration flight test
Fig. 2.16 	Learjet Model 35 aircraft.
76 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 92 of 650 --

maneuvers to define aircraft characteristics such as lift and drag, along with
engine characteristics such as corrected thrust and corrected air flow. These
characteristics were then input into a performance modeling computer program
that would iterate to predict aircraft performance characteristics such as range
and fuel flow for any flight condition. A Learjet Model 35 aircraft was used as
Fig. 2.17 	Thrust run load cell=tie down configuration.
Fig. 2.18 	Learjet 35 thrust run corrected thrust data.
A REVIEW OF BASIC PROPULSION 	77

-- 93 of 650 --

the flight test vehicle to develop and evaluate the approach. The aircraft is
shown in Fig. 2.16.
Of particular application to the material in this chapter, the individual char-
acteristics of each engine on the aircraft had to be evaluated and compared to
the generic engine model (sometimes referred to as the engine deck) supplied
by the engine manufacturer. This was accomplished by conducting a ground
thrust run where the aircraft was tied down and the static thrust on each engine
was measured with a load cell. The thrust run setup is illustrated in Fig. 2.17.
The thrust run data was reduced using corrected property form and com-
pared to the engine deck. The actual graph for corrected thrust vs corrected
rpm is presented in Fig. 2.18. Notice that the engines on the test aircraft were
producing somewhat less thrust than that predicted by the engine deck.
The final step was to adjust the engine deck to reflect the actual characteris-
tics of each engine based on the thrust run. This is an important step in any
flight test program since determination of aircraft drag is directly dependent on
the thrust prediction.
Reference
1 Yechout, T. R., and Braman, K. B., Development and Evaluation of a Performance
Modeling Flight Test Approach Based on Quasi Steady-State Maneuvers, NASA CR
170414, NASA Dryden Flight Research Facility, April 1984.
Problems
2.1 	The mass flow of air through a turbojet engine in flight is 0.5 slug=s. The
jet exhaust velocity is 1000 ft=s and the flight velocity is 180 kn TAS.
Neglect the mass of the fuel burned.
(a) 	Find the magnitude of the gross thrust.
(b) 	Find the magnitude of the ram drag.
2.2 	What installed static military thrust (N ¼ 21;700 rpm) would you expect
for the T-37 with a pressure altitude of 6200 ft and an ambient tempera-
ture of 85F?
2.3 	A T-37 is cruising at 10,000 ft pressure altitude at 300 kn true airspeed.
The 	outside 	air 	temperature 	is 	20F 	and 	the 	engine 	speed 	is
18,000 rpm. Find the net thrust and fuel flow. Assume the angle between
the ram drag and gross thrust is 180 deg.
78 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 94 of 650 --

3
Aircraft Performance
3.1 	Airspeed
An understanding of airspeed is critical to interpreting and discussing
aircraft performance. To this point, we have only dealt with true airspeed. This
section addresses indicated, calibrated, equivalent, and ground speed.
A pilot needs a direct indication related to the performance of the aircraft.
This is done by measuring, and displaying, airspeed on an airspeed indicator.
However, we’ll see that the airspeed the pilot reads can be quite different than
the true velocity (V1) of the aircraft.
First, we will introduce some terminology:
1) Static pressure ( p) is the pressure because of random molecular motion and
is devoid of any contribution from the flow velocity.
2) Total pressure ( p o) is the pressure that exists at a stagnation point, or would
exist at any point in the flow, if it were isentropically slowed to zero
velocity.
3) Indicated airspeed (V i) is the airspeed displayed in the cockpit and is
obtained from pitot-static instrumentation and ‘‘fed’’ into the airspeed
indicator.
4) Calibrated airspeed (Vc) is the indicated airspeed corrected for position
error.
5) Equivalent airspeed (V e) is the calibrated airspeed corrected for nonstan-
dard sea-level pressure.
6) True airspeed (V ) is airspeed relative to the air mass. It is equivalent
airspeed corrected for non-standard, sea-level density.
7) Ground speed (V g) is speed relative to the ground. It is true airspeed
corrected for wind.
8) Position error (DVp) is obtained from flight test and is a correction between
indicated and calibrated airspeed, used to account for error in static port
placement and known instrument errors.
9) f Factor ( f ) is a nonstandard sea-level pressure correction factor and is the
ratio between equivalent and calibrated airspeeds.
A pitot-static tube (or a pitot tube with a separate static source) is used to
measure an aircraft’s airspeed. The static source senses the static pressure ( p)
of the freestream air and the pitot tube senses the air’s total pressure ( p o).
These pressures are fed to either a mechanical or digital airspeed measurement
system. In a mechanical system, static and total pressures are fed to opposite
79

-- 95 of 650 --

sides of a thin, metallic, airspeed diaphragm. The diaphragm is in a sealed
case as shown in Fig. 3.1.
The mechanical expansion and contraction of the diaphragm (which is
coupled to a system of gears and levers) translates the pressure difference
( p o  p, or Dp) into a reading on the aircraft’s airspeed indicator. The airspeed
the pilot sees on the face of this instrument is called the indicated airspeed, or
Vi.
Airspeed indicators must be simple and reliable instruments designed to
relate a pressure difference (Dp), from the pitot–static system, to a velocity for
all speed regimes, namely both incompressible and compressible flow. Histori-
cally, this distinction gave rise to two types of airspeed indicators—those for
incompressible flow and those for compressible flow. Aircraft built before
approximately 1925 operated exclusively at incompressible airspeeds; they had
incompressible airspeed indicators. Because these are inaccurate for high-speed
flight, we will concentrate on defining airspeeds using the compressible flow
equations.
The following equation (from Ref. 1) defines true airspeed, as a function of
density and pressure, and is valid for incompressible and compressible sub-
sonic flow.
V ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1
r
 
7p Dp
p þ 1
 	 1
3:5
1
" 	#	( 	)	v
u
u
t 	ð3:1Þ
The velocity (without a subscript) is true airspeed, defined as the speed of the
aircraft relative to the air mass in which it is moving. To help distinguish
between true airspeed and ground speed (Vg ), consider the following example:
Fig. 3.1 	Aircraft pitot–static airspeed system.
80 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 96 of 650 --

Example 3.1
An aircraft flying at 300 kn true airspeed has a 50 kn tailwind. What is its
ground speed?
To obtain ground speed, simply use vector addition.
!
Vairplane ¼ 300 kn þ !
Vwind ¼ 50 kn ¼ !
Vground ¼ 350 kn
It is easy to see that ground speed is simply true airspeed corrected for
wind conditions. Referring to Eq. (3.1), note that true airspeed is a function of
three variables (Dp, p and r), not a simple equation to engineer into a mechan-
ical instrument. In addition, values of r, which in turn depend on pressure and
temperature, are difficult to determine accurately with instruments. For these
reasons, it is difficult to build a simple and reliable airspeed indicator based on
Eq. (3.1).
Engineers surmounted this problem by simplifying the equation. In the
factory, airspeed indicators are machined with gears calibrated to use sea-level
standard atmospheric values of p and r. So, in effect, an airspeed indicator is
calibrated to solve the expression
Vc ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1
rSL
 	
7p SL
Dp
p SL
þ 1
 	 1
3:5
1
" 	#	( 	)	v
u
u
t 	ð3:2Þ
where V c is called the calibrated airspeed. However, this is still not what is
indicated on the airspeed indicator. The static ports on the aircraft may be
located such that they do not accurately measure the freestream static pressure
under all flight conditions. This is referred to as position or installation error.
Additionally, there may be small inaccuracies in the machining of the instru-
ment. To account for these discrepancies, errors are quantified during flight
testing and equated to a velocity change (DVp) called position error. Therefore,
the relationship between what is displayed on the airspeed indicator (indicated
airspeed, Vi) and the calibrated airspeed is given as
V c ¼ Vi þ DV p 	ð3:3Þ
In other words, on a perfect airspeed indicator (zero position error), a pilot
reading indicated airspeed would also be reading calibrated airspeed. However,
in most cases DVp does not equal zero, and indicated airspeed is slightly differ-
ent than calibrated airspeed.
To obtain true airspeed [Eq. (3.1)] from calibrated airspeed [Eq. (3.2)], two
corrections must be made—one for the actual existing pressure, and the other
for the actual density. We’ll make these corrections in two steps.
AIRCRAFT PERFORMANCE 	81

-- 97 of 650 --

1) First, we will look at the pressure correction. Define equivalent airspeed,
Ve, as
Ve ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1
rSL
 	
7p Dp
p þ 1
 	 1
3:5
1
" 	#	( 	)	v
u
u
t 	ð3:4Þ
Note the values of actual pressure are used here, as opposed to the sea-level
values in Eq. (3.2). To relate Vc to Ve, a pressure correction factor (called ‘‘f’’)
is used:
V e ¼ f V c 	ð3:5Þ
where
f ¼ V e
V c
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1
rSL
 	
7p Dp
p þ 1
 	 1
3:5
1
" 	#!	( 	)	v
u
u
t
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1
rSL
 	
7p SL
Dp
p SL
þ 1
 	 1
3:5
1
" 	#	( 	)	v
u
u
t
ð3:6Þ
Note that f depends only on Dp and p. All other variables are constant. The
value of Dp can be obtained from the calibrated airspeed, and p can be
obtained by specifying a pressure altitude. In this manner, Table 3.1 of f
factors can be produced—this table is independent of aircraft. Note that in
some literature, including undergraduate pilot training texts, this pressure
correction factor is referred to as a compressibility correction.
Table 3.1 	f Factor table
Pressure
altitude, ft 	Calibrated airspeed, kn
100 	125 	150 	175 	200 	225 	250 	275 	300
5000 	0.999 	0.999 	0.999 	0.998 	0.998 	0.997 	0.997 	0.996 	0.995
10000 	0.999 	0.998 	0.997 	0.996 	0.995 	0.994 	0.992 	0.991 	0.989
15000 	0.998 	0.997 	0.995 	0.994 	0.992 	0.990 	0.987 	0.985 	0.982
20000 	0.997 	0.995 	0.993 	0.990 	0.987 	0.984 	0.981 	0.977 	0.973
25000 	0.995 	0.993 	0.990 	0.986 	0.982 	0.978 	0.973 	0.968 	0.963
30000 	0.993 	0.990 	0.986 	0.981 	0.975 	0.970 	0.963 	0.957 	0.950
35000 	0.991 	0.986 	0.981 	0.974 	0.967 	0.959 	0.951 	0.943 	0.934
40000 	0.988 	0.982 	0.974 	0.966 	0.957 	0.947 	0.937 	0.926 	0.916
45000 	0.984 	0.976 	0.966 	0.956 	0.944 	0.932 	0.920 	0.907 	0.895
50000 	0.979 	0.969 	0.957 	0.944 	0.930 	0.915 	0.901 	0.886 	0.871
82 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 98 of 650 --

2) Now, we will tackle the density correction. If we multiply Eq. (3.4) by
ðrSL=rÞ0:5 , Eq. (3.1) (the equation for true velocity) is reobtained, as shown:
V ¼ Ve
ffiffiffiffiffiffiffi
rSL
r
r
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
rSL
r
 	 1
rSL
 	
7p Dp
p þ 1
 	 1
3:5
1
" 	#	( 	)	v
u
u
t
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1
r
 
7p Dp
p þ 1
 	 1
3:5
1
" 	#	( 	)	v
u
u
t
Therefore,
V ¼ Ve
ffiffiffiffiffiffiffi
rSL
r
r
ð3:7Þ
Because the density ratio rSL=r is usually  1, V is usually  Ve . Notice, if
we are flying at sea level on a standard day, rSL=r ¼ 1:0, and from the equa-
tion above, V ¼ V e. In other words, Ve is the same as true airspeed at sea level
on a standard day.
Recall, lift, drag, and moments depend on dynamic pressure, q.
qq ¼ 1
2 rV 2 	ð3:8Þ
If we replace the true velocity (V ), with Eq. (3.7) we obtain
qq ¼ 1
2 rSL V 2
e 	ð3:9Þ
Notice that the dynamic pressure does not depend on altitude if we define it
using equivalent airspeed rather than true. In other words, at a given angle of
attack, lift, drag, and moment remain the same for a particular Ve, regardless
of altitude. This becomes very useful to both engineers and pilots.
The following summarizes our discussion:
1) indicated to calibrated: apply position error (DV p).
Vc ¼ Vi þ D Vp 	ð3:10Þ
2) calibrated to equivalent: adjust for actual pressure at altitude.
Ve ¼ f Vc 	ð3:11Þ
AIRCRAFT PERFORMANCE 	83

-- 99 of 650 --

3) equivalent to true: adjust for actual density at altitude.
V ¼ Ve
ffiffiffiffiffiffiffi
rSL
r
r
¼ Ve
ffiffiffi
1
s
r
ð3:12Þ
4) true to ground speed: vector addition of wind to true airspeed.
V
!
G ¼ V
!
þ V
!
wind 	ð3:13Þ
This may seem like a lot to remember. A handy aid used by pilots is the acro-
nym ICE-T (Indicated, Calibrated, Equivalent, and True Airspeed). When used
with the radical sign as shown in Fig. 3.2, it relates the magnitudes of all the
different velocities to each other.
Notice that indicated and calibrated airspeeds are nearly the same. Equiva-
lent is usually less than calibrated, and true airspeed is usually greater than the
others.
Finally, does a pilot need to dig out paper and pencil to calculate true
airspeed? The answer is no. Most pilots use a hand-held computer allowing
them to carry out the necessary calculations with relative ease. Even better,
most modern aircraft use flight data computers. Any airspeed the pilot wants
can usually be displayed with the push of a button.
Example 3.2
An aircraft has an indicated airspeed of 200 kn and is flying at an altitude
of 25,000 ft (assume standard atmosphere conditions). If the position error is
þ1 kn, find the true airspeed.
We start by finding the calibrated airspeed with Eq. (3.10).
V c ¼ Vi þ DVp ¼ 200 þ 1 ¼ 201 kn
To convert calibrated airspeed to equivalent airspeed, we use Eq. (3.11) and
Table 3.1 to find the f factor.
V e ¼ f Vc ¼ ð0:982Þð201Þ ¼ 197:4 kn
Fig. 3.2 	ICE-T convention.
84 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 100 of 650 --

The final step involves using Eq. (3.12) to determine true airspeed.
V ¼ Ve
ffiffiffiffiffiffiffi
rSL
r
r
¼ ð197:4Þ
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
0:00238
0:00107
r
¼ 294:4 kn
Notice that we have carried units of knots throughout the problem. Although
knots are not consistent units, they can be used for airspeed problems if used
for each step in the conversion process.
Example 3.3
An aircraft has a 20-kn headwind and would like a 200-kn ground speed. If
the aircraft is flying at 10,000 ft (standard day), what indicated airspeed should
it fly if the position error is 1 kn?
We must first determine the true airspeed that the aircraft needs to maintain.
V ¼ Vground þ Vwind ¼ 200 þ 20 ¼ 220 kn
Next, we determine the equivalent airspeed using Eq. (3.12).
V e ¼ V
ffiffiffiffiffiffiffi
r
rSL
r
¼ ð220Þ
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
0:00176
0:00238
r
¼ 189:2 kn
To determine the calibrated airspeed, we must use Table 3.1 in reverse.
Because calibrated and equivalent airspeeds are close in value, we will simply
enter Table 3.1 with our equivalent airspeed to determine the f factor. To be
perfectly correct, we should iterate on the f factor value (go in the reverse
direction). With the simple approach and Eq. (3.11), we have,
V c ¼ Ve
f ¼ 189:2
0:995 ¼ 190:2 kn
Finally, we determine the indicated airspeed using Eq. (3.10).
V i ¼ Vc  DV p ¼ 190:2  ð1Þ ¼ 191:2 kn
3.2 	Equations of Motion for Straight, Level, and Unaccelerated
Flight
Consider an aircraft flying a curvilinear path as shown in Fig. 3.3. To fly a
curved path, a net force (Fnet ), composed of force components parallel and
perpendicular to the flight path, must exist. In applying Newton’s 2nd law,
acceleration parallel (linear) to the flight path is dV =dt—centripetal accelera-
tion is V 2=r, where r is the radius of curvature of the curvilinear path.
Lift, drag, thrust, and weight are the four forces acting on an aircraft—these
are shown in Fig. 3.4.
AIRCRAFT PERFORMANCE 	85

-- 101 of 650 --

A few points to remember about the figure:
1) Lift and drag, as discussed in Chapter 1, are the components of the
aerodynamic force perpendicular and parallel to the relative wind (V1).
2) The x axis is a body-fixed axis, aligned with the ‘‘reference line’’ of the
aircraft.
3) The aircraft’s angle of attack (a) is between the x axis and the relative wind.
4) In general, the thrust vector is not aligned with the aircraft’s reference line.
Rather, it is displaced through an angle fT , called the thrust angle.
5) The flight path angle (g) is the angle between the horizon and the relative
wind.
6) The pitch angle (Y) is the angle between the aircraft’s reference line and
the horizon. It is sometimes referred to as pitch attitude or the deck angle
(on transports, the cargo deck is usually taken as the aircraft’s reference
line).
Fig. 3.3 	Aircraft flying a curvilinear path.
Fig. 3.4 	Forces and angles acting on an aircraft in flight.
86 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 102 of 650 --

Summing forces, parallel and perpendicular to the flight path, yields the
following.
SFparallel ¼ m dV
dt
 	
¼ T cosðfT þ aÞ  D  W sin g 	ð3:14Þ
SFperpendicular ¼ m V 2
r
 	
¼ W cos g  L  T sinða þ fT Þ 	ð3:15Þ
Because these equations are in a general form, we will return to them fre-
quently. By making appropriate assumptions, we will reduce these equations to
predict aircraft performance for a wide variety of situations (for example,
glides and climbs).
The first case we will look at is rather simple, yet provides terrific insight.
Consider the special case of straight, level, and unaccelerated flight (SLUF).
We will apply these assumptions to the general equations of motion (EOM)
which are Eqs. (3.14) and (3.15):
1) ‘‘Straight’’ implies that the aircraft’s radius of curvature approaches infinity.
Therefore, the centripetal acceleration term ðV 2=rÞ goes to zero.
2) The flight path angle, g, is zero for ‘‘level’’ flight. The cos g ¼ 1:0 and the
sin g ¼ 0:0.
3) Linear acceleration (dV =dt) is zero for ‘‘unaccelerated’’ flight.
Additionally, if we assume the thrust angle and angle of attack are small,
then cosðfT þ aÞ ¼ 1 and sinðfT þ aÞ ¼ 0. With these assumptions, the equa-
tions of motion reduce to:
L ¼ W ðload factor ¼ 1Þ 	ð3:16Þ
T ¼ D 	ð3:17Þ
A simple, yet useful, result for level unaccelerated flight is that an aircraft’s lift
balances its weight. The engines must produce sufficient thrust to overcome
aerodynamic drag.
3.3 	Thrust and Power Curves
Frequently, the term ‘‘thrust required’’ (TR), is used—it is the amount of
thrust necessary to overcome drag, regardless of the maneuver. For SLUF,
thrust required is simply equal to the total aircraft drag, as presented in Sec.
1.5.3.
TR ¼ D ¼ ½C D0 þ KC2
LqqS 	ð3:18Þ
AIRCRAFT PERFORMANCE 	87

-- 103 of 650 --

or
T R ¼ 	C D0
1
2 rS
 	
V 2 þ 2KðnW Þ2
rS
" 	#
1
V 2 	ð3:19Þ
Thrust available (T A), on the other hand, is the amount of thrust available to
the pilot and is strictly engine(s) dependent. As we saw in Chapter 2, T A is a
function of altitude, airspeed, and throttle setting. Figure 3.5 is a generic
‘‘thrust curve,’’ where T R and TA are plotted as a function of velocity (or Mach
number).
A great deal of information is captured in an aircraft’s thrust curve. Remem-
ber that drag (therefore, T R) changes with altitude, weight=load factor, and=or
configuration—again, refer to Sec. 1.5.3. Change any of these, and the thrust
required curve changes.
1) Assume for a minute, the pilot’s maximum thrust available is represented
by the TAÞ1 curve. Note the following:
a) At all airspeeds below V5 thrust available exceeds thrust required.
Therefore, by adjusting the throttle, SLUF can be achieved at any
point on the TR curve.
b) At low airspeeds, the aircraft is ‘‘stall limited.’’ Even though there is
sufficient thrust available to overcome drag (or TR), the aircraft stalls
below V1.
c) V5 is the maximum velocity achievable in SLUF conditions.
2) Now, assume the pilot adjusts the throttle to the thrust available represented
by the T AÞ2 curve. Note the following:
a) SLUF can only be achieved at V2 and V4 .
b) Below V2 and beyond V4 , the thrust required exceeds the thrust
available. The aircraft will slow down to either the stall limit or to V4 .
Fig. 3.5 	Generic thrust curves.
88 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 104 of 650 --

c) Between V2 and V4, thrust available exceeds thrust required and the
aircraft will accelerate to V4 . To stabilize the aircraft in SLUF at V2 , the
pilot must generally reduce power, increase angle of attack, and then
increase power back to TAÞ2 to achieve this slowflight condition.
3) V3 is an extremely significant airspeed—total aircraft drag (or TR) is a
minimum. The ratio of lift to drag (L=D) is maximized. Also, parasite and
induced drag are equal.
Example 3.4
A 12,000-lb T-38 is at 10,000 ft. Using the T-38 Performance Charts in
Appendix D, find
1) L=DÞmax
2) The induced drag at L=DÞmax
3) The true airspeed at L=DÞmax
4) The stall Mach number
5) The maximum Mach number for mil power
We begin by referring to the T-38 10,000-ft performance chart in Appendix
D and the 12,000-lb drag curve:
1) L=DÞmax occurs at the minimum point on the drag curve. For 1-g SLUF we
have:
L
D

max
¼ W
Dmin
¼ 12;000
1000 ¼ 12
2) The induced drag and parasite drag are equal at L=DÞmax . Thus
Dinduced ¼ 1
2 Dmin ¼ 1
2 ð1000Þ ¼ 500 lb
3) From the chart, the Mach number at L=DÞmax is 0.5. Using the standard
atmosphere tables, the speed of sound at 10,000 ft (standard atmosphere) is
1077.4 ft=s. Thus,
V ¼ Ma ¼ ð0:5Þð1077:4Þ ¼ 538:7 ft=s
4) The stall (buffet) Mach number is 0.305 as read from the chart.
5) The max Mach number at mil power is 0.96 as read from the chart.
Power curves typically present power required (P R) and power available
(PA) as a function of the trim velocity of the aircraft. The power curves evolve
AIRCRAFT PERFORMANCE 	89

-- 105 of 650 --

directly from the quantities of thrust available and thrust required using the
following relationships:
P R ¼ T R V1 ¼ DV1
P A ¼ T A V1
ð3:20Þ
A check of the units shows that a thrust force times a distance divided by time
is work per unit time or power. The power curves can be generated from an
aircraft’s thrust curves by simply multiplying thrust required times the corre-
sponding trim velocity at several points to obtain a series of power required
points, which will define the power required curve. A similar approach may be
used to obtain the power available curve. Typical thrust and power curves for
the same aircraft are presented in Fig. 3.6.
In Fig. 3.6, the scale of the velocity axis is the same for both the thrust and
power graphs. Take note of how Vmax and VL=DÞmax translate to their respective
points on each graph. In particular, note that the tangent from the origin to the
PR curve graphically locates the velocity for TRmin . The slope of the tangent
line is actually PR=V ¼ T R V =V ¼ TR , so that the minimum slope, which
occurs with the tangent, locates the velocity for TRmin , and thus Dmin and
L=DÞmax . Both thrust and power curves vary with aircraft weight, configuration,
Fig. 3.6 	Typical thrust and power curves for the same aircraft.
90 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 106 of 650 --

load factor, and altitude. Both are very useful in aircraft performance predic-
tions.
3.4 	Takeoff and Landing Performance
Takeoff is one of the most demanding phases of flight. The aircraft’s
engines are typically operating at maximum rating. Airspeeds are low, so
control is minimal. Combine these considerations with low altitude and there is
little room for error. In this section, we will examine the forces during takeoff,
apply Newton’s 2nd law, and arrive at two ways to predict takeoff performance:
1) ‘‘average acceleration method,’’ and 2) numerical method.
3.4.1 	Takeoff Phases and Ground Roll Distance
As shown in Fig. 3.7, takeoff performance includes a ground roll, aircraft
rotation, transition, and climb-out phase. In our discussion, we will address
only the ground-roll distance, S G. As shown, the velocity corresponding to S G
is VG.
VG is the lift-off velocity (VLOF ), corrected for winds (VG ¼ V LOF þ =
VWINDÞ—add for a tail wind, subtract for a headwind. The liftoff velocity is
typically expressed as some factor above the aircraft’s stall speed. We will use
VLOF ¼ 1:1VSTALL where VSTALL is defined in Eq. (1.34).
We will now derive a general expression for the ground-roll distance. Refer-
ring to Fig. 3.7, we will assume no wind and integrate between brake release
(both S and V are equal to zero) and S G (where V is V G). Using the chain
rule:
dS ¼ dS
dt
dt
dV dV ¼ V 1
a dV ¼ 1
a V dV
where a is acceleration or dV =dt. Now integrating both sides from brake
release to the ground roll distance,
ðS¼S G
S¼0
dS ¼
ðV ¼VG
V ¼0
1
a V dV 	ð3:21Þ
Fig. 3.7 	Takeoff phases.
AIRCRAFT PERFORMANCE 	91

-- 107 of 650 --

Look at the right-hand side of Eq. (3.21). To integrate it, we will take two
approaches during the ground roll: 1) assume acceleration is a constant, and 2)
use a numerical approach, and account for acceleration changing. In either
case, we will have to evaluate acceleration, which is obtained from Newton’s
2nd law (F ¼ ma).
3.4.2 	Forces During Takeoff
As mentioned previously, we will use Newton’s 2nd law and identify the
forces during the takeoff roll. Consider Fig. 3.8 below in which the runway
slope is greatly exaggerated.
Lift, drag, thrust, and weight are shown. j is the runway’s slope—a positive
slope is shown (worst case). Additionally, there is a retarding force (R) because
of friction between the wheels and the runway. This is developed below, where
mr is the rolling friction coefficient.
SFz ¼ maz ¼ 0
¼ W cos j  L  N
For small j, cos  1, and
N  W  L
The retarding force then becomes
R  mrðW  LÞ 	ð3:22Þ
Typical values of mr range between 0.02 for a dry concrete runway to 0.3 for
very soft ground. Returning back to Fig. 3.8, we can apply Newton’s 2nd law
in the x direction to obtain an expression for acceleration during the ground
roll.
SFx ¼ max ¼ W
g a x ¼ T  D  W sin j  R
Fig. 3.8 	Forces during takeoff roll.
92 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 108 of 650 --

If we assume j is small, sin j  j, and
a x  g
W ½T  D  W j  mrðW  LÞ 	ð3:23Þ
To gain some further insight, assume for a minute that the runway slope is
zero. Additionally, ignore any thrust variation with velocity. Figure 3.9 shows
how the forces (with these assumptions) change during the takeoff roll.
Note the following:
1) Lift and drag start at zero. They both increase through the takeoff roll; both
forces are proportional to V 2 .
2) W is constant during the takeoff roll (ignoring fuel consumption).
3) R decreases during the takeoff roll because the normal force, N , decreases
as lift increases. R is zero at liftoff (weight is equal to lift).
4) With our assumptions, the difference between thrust and ½D þ mrðW  LÞ
is the net acceleration force (again, we have assumed W j is zero). This is a
direct indicator of acceleration capability.
Now, the essentials are in place to estimate takeoff roll. Again, we will take
two approaches. The easiest will be first.
3.4.3 	Average Acceleration Method
If we assume acceleration is constant (denoted by aa) during the takeoff roll,
Eq. (3.21) can be integrated as shown:
S G ¼ 1
aa
ðV ¼VG
V ¼0
V dV ¼ 1
aa
V 2
2
V G
0
S G ¼ 1
aa
V 2
G
2 ¼ V 2
G
2aa
ð3:24Þ
Fig. 3.9 	Variation of forces during takeoff roll.
AIRCRAFT PERFORMANCE 	93

-- 109 of 650 --

A headwind will reduce VG by the wind component parallel to the runway and,
in a similar manner, a tail wind will increase V G. Thus, a headwind will
decrease S G and a tail wind will increase S G. This is why the runway direction
for takeoff (and landing) is generally selected based on having a headwind
component. Equation (3.24) can be simply modified to account for a head or
tail wind:
S G ¼ 1
aa
V 2
G
2 ¼ ðV LOE  VwindÞ2
2aa
The minus sign is used for a head wind component and the plus sign is used
for a tail wind component.
What value of acceleration do we use in Eq. (3.24)? In Sec. 3.4.2, we
derived an expression for acceleration [Eq. (3.23)]. It is repeated next, however,
in terms of average values:
aa ¼ g
W ½Tavg  Davg  W j  mrðW  LavgÞ
For this approach, we will assume thrust, aircraft weight, rolling friction coeffi-
cient, and runway slope are constant during the takeoff roll. To evaluate lift
and drag, we will use an average velocity, as derived next. Let
Davg ¼ CD
1
2 rV 2
avgS
Davg ¼ DS¼0 þ D S¼S G
2
CD
1
2 rV 2
avgS ¼ CD 1
2 rV 2
S¼0S þ C D 1
2 rV 2
S¼SG S
2
Of course, for no wind conditions, V S¼0 . Therefore
Vavg ¼ VG
ffiffiffi
2
p ¼ :707½VLOF  	ð3:25Þ
With a headwind or tailwind, Vavg could be adjusted slightly using this
approach but it is normally not, because the average velocity of Eq. (3.25)
using Vavg ¼ VLOF = ffiffiffi
2
p provides sufficient accuracy for the average acceleration
method. If engine thrust data are available, we should use the thrust at Vavg .
Additionally, lift and drag are functions of lift coefficient CL. Again, we will
use an optimal value, called ‘‘C Lopt .’’ To define this value, we will try to maxi-
mize aa with respect to CL.
@aa
@CL
¼ @
@C L
g
W fTavg  Davg  mrðW  LavgÞ  W jg
h 	i
¼ 0
94 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 110 of 650 --

Recalling that D ¼ ðCD0 þ KC2
LÞqqS, we can see that only the Davg and Lavg
terms are a function of CL. Taking the partial derivative, we then have:
0 ¼ 2 g
W KC L qqS þ g
W mr qqS
and solving for CL
CL ¼ mr
2K ¼ CLopt 	ð3:26Þ
As you can see, we have made several simplifying assumptions to estimate
an aircraft’s ground roll. In the next section, we’ll use a numerical approach to
achieve greater accuracy.
Example 3.5
Using the average acceleration method, find the max power takeoff ground
roll, with no wind and a zero runway slope, for a 12,000-lb T-38 at sea level
and 6000 ft given the following conditions:
S ¼ 170 ft 2 	CLmax ¼ 0:88 	mr ¼ 0:025 	C D0 ¼ 0:02 	K ¼ 0:2
We will first work the problem for sea level. Using Eq. (1.33), we determine
the stall speed.
Vstall ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2W
rSC Lmax
s
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2ð12;000Þ
ð0:00238Þð170Þð0:88Þ
s
¼ 259:6 ft=s
We next determine the lift-off velocity,
VLOF ¼ 1:1Vstall ¼ 1:1ð259:6Þ ¼ 285:6 ft=s
and the average velocity [using Eq. (3.25)].
Vavg ¼ 0:707½V LOF  ¼ 0:707ð285:6Þ ¼ 201:9 ft=s
The average Mach number then becomes
Mavg ¼ Vavg
a SL
¼ 201:9
1116:4 ¼ 0:181
The T-38 sea-level thrust and drag chart at Max power and 0.181 Mach gives
us
T avg  6000 lb
AIRCRAFT PERFORMANCE 	95

-- 111 of 650 --

Using Eq. (3.26),
CLopt ¼ mr
2K ¼ 0:025
2ð0:2Þ ¼ 0:0625
and
CDavg ¼ C D0 þ KC2
Lopt ¼ 0:02 þ ð0:2Þð0:0625Þ2 ¼ 0:0208
The average dynamic pressure is
qqavg ¼ 1
2 rV 2
avg ¼ 1
2 ð0:00238Þð201:9Þ2 ¼ 48:5 psf
We next determine the average acceleration
aa ¼ g
W ½Tavg  Davg  mrðW  LavgÞ
¼ 32:2
12;000 ½6000  ð0:0208Þð48:5Þð170Þ
 0:025f12;000  ð0:0625Þð48:5Þð170Þg
aa ¼ 14:9 ft=s 2
and use Eq. (3.24) to calculate the ground roll with V G ¼ VLOF for the no
wind case.
S G SL ¼ 1
aa
V 2
G
2 ¼ V 2
G
2aa ¼ ð285:6Þ2
2ð14:9Þ ¼ 2737 ft
The same steps are used to calculate the ground roll at 6000 ft with appropriate
changes in air density, the speed of sound, and interpolation of the T-38 thrust
curves. Intermediate values for this analysis are:
VLOF ¼ 312:6 ft=s 	Vavg ¼ 220:8 ft=s 	Tavg  5100 lb 	aa ¼ 12:5 ft=s2
The ground roll at 6000 ft is
S G6000 ft ¼ 3909 ft
Notice the 42% increase in ground roll distance with the increase in altitude.
This results from a decrease in thrust and an increase in VLOF .
3.4.4 	Numerical Method
The last section discussed how to solve the takeoff distance problem as-
suming that acceleration remains constant and can be defined at Vaverage ¼
96 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 112 of 650 --

VLOF = ffiffiffi
2
p . This may not be a good assumption for some airplanes if the accel-
eration varies significantly during the takeoff roll. For many airplanes, the take-
off acceleration drops off somewhat as VLOF is approached. To obtain a more
precise prediction of the takeoff roll, a numerical integration technique, or a
numerical method, may be used.
3.4.4.1 Euler method. 	We will start the analysis using a simple Euler
method for numerical integration. Recall Eq. (3.23),
a ¼ g
W ½T  D  W j  mrðW  LÞ
Rewriting this in terms of CL and C D , we have
a ¼ g
W T  W j  mr W  ðC D  mCLÞ 1
2 rV 2S
 	
ð3:27Þ
which gives us the instantaneous acceleration at any point during the ground
roll. Assuming the pitch attitude of the aircraft remains constant during the
ground roll, we can see that the angle of attack of the aircraft will remain
constant along with CL and C D. If we also assume that r, W , and mr remain
constant, then determination of the acceleration at any point during the ground
roll becomes a function of the thrust (T) and the velocity. Using the Euler
method and Eq. (3.27), we can divide the takeoff roll into several small time
intervals, assume the acceleration is constant during each interval, and obtain
the velocity at the end of each interval. Figure 3.10 illustrates this approach.
The time interval, Dt, is usually a constant and made as small as practical
(not larger that 0.1 s).
Dt ¼ t1  t0 ¼ t2  t1 ) etc:
For the first interval, V0 ¼ 0 at t0 ¼ 0 (because this is at brake release), and
the initial acceleration is
a0 ¼ g
W ½T V ¼0  W j  mr W 
The velocity V1 at time t1 can be computed using the Euler method.
V1 ¼ V0 þ a0ðt1  t0Þ ¼ a0ðDtÞ
The velocity V2 can be calculated in a similar fashion using the result for V1
and Eq. (3.27) for acceleration.
V2 ¼ V1 þ a1ðt2  t1Þ ¼ V1 þ a1ðDtÞ
AIRCRAFT PERFORMANCE 	97

-- 113 of 650 --

with
a1 ¼ g
W T  W j  mr W  ðCD  mCLÞ 1
2 rV 2
1
 	
The general form of the Euler integration for velocity then becomes
Vnþ1 ¼ Vn þ a nðDtÞ 	ð3:28Þ
where
tnþ1 ¼ tn þ Dt 	ð3:29Þ
Using this approach and a series of integrations, the ground roll velocity can
be determined as a function of time.
Next, we can find the distance traveled during each time interval by using
the Euler method on the velocity vs time characteristics. With this method we
now assume that V is constant over each time interval (just as we previously
assumed acceleration was constant during an interval). Figure 3.11 illustrates
this approach.
Remembering that S0 and V0 are zero, we have
S1 ¼ S0 þ V0ðt1  t0Þ ¼ 0
and
S2 ¼ S1 þ V1ðt2  t1Þ ¼ S1 þ V1ðDtÞ
Fig. 3.10 	Euler integration to obtain velocity.
98 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 114 of 650 --

or in general form
S nþ1 ¼ S n þ V nðtnþ1  t nÞ ¼ S n þ VnDt 	ð3:30Þ
Because the velocity curve is much steeper than the acceleration curve, the
Euler method results in considerable error unless Dt is chosen to be very
small. Greater accuracy can be achieved using Heun’s predictor–corrector
method (often referred to as the modified Euler method).
3.4.4.2 Heun’s method. 	Heun’s method uses an average of the dependant
variable value for each time interval rather than the value at the beginning of the
interval. For rapidly changing curves such as takeoff velocity vs time, Heun’s
method improves the accuracy of the integration over that provided by the Euler
method if the same Dt is used. This can be seen in Fig. 3.12. For takeoff distance,
the equations become
S1 ¼ S0 þ V0 þ V1
2 ðt1  t0Þ ¼ S0 þ V0 þ V1
2 ðDtÞ
S2 ¼ S1 þ V1 þ V2
2 ðDtÞ
or in general form,
S nþ1 ¼ S n þ ðVn þ V nþ1Þ
2 ðDtÞ 	ð3:31Þ
Fig. 3.11 	Euler integration to obtain distance.
AIRCRAFT PERFORMANCE 	99

-- 115 of 650 --

3.4.4.3 Approach. 	The Euler method works well for relatively flat curves
such as acceleration vs time during a takeoff roll. As discussed, Heun’s method
provides more accuracy when integrating the velocity vs time curve to obtain
distance. Several other numerical integration methods may also be used; however,
with the speed of modern computer, Dt can be made very small and good
accuracy can be obtained using the following approach to numerically determine
takeoff distance:
1) Choose a Dt as small as practical but not larger than 0.1 s
2) Using Eq. (3.27) and remembering that V0 ¼ S0 ¼ 0 at time t0 ¼ 0,
compute a0 .
3) Use the Euler method [Eq. (3.28)] to compute V1 .
4) Use Heun’s method [Eq. (3.31)] to compute S1 .
5) Increment the time using Eq. (3.29).
6) Repeat Steps 2–5 for succeeding time intervals until Vn ¼ VLOF  Vwind .
Remember that the acceleration term (a n) in Eq. (3.28) is computed using
Eq. (3.27) and Vn for each iteration.
If needed, even more accurate numerical methods such as a Runge–Kutta
integration are available in software analysis packages such as MATLAB1 (a
registered trademark of The MathWorks, Inc.).
3.4.5 	Landing Performance
Landing is another very demanding phase of flight. As with takeoff, the
aircraft is operating at airspeeds near the stall and, in addition, precise control
of the flight path is important to assure touchdown at the desired point on the
runway and with a minimum sink rate. Another challenge involved in landing
is dissipating the energy of the aircraft once on the ground to bring it to a
stop. Landing performance is very dependent on pilot technique.
Landing performance is generally divided into three phases: the approach,
the flare, and the ground roll. The approach is typically flown at approximately
Fig. 3.12 	Heun’s method integration to obtain distance.
100 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 116 of 650 --

1:3 Vstall to allow a margin of safety above the stall for turbulence and control
input perturbations. The flare is generally initiated within a wingspan of the
ground and consists of a gradual power reduction to idle and increase in the
angle of attack to slow the aircraft to approximately 1:15 Vstall for touchdown
(VTD) and to reduce the aircraft’s sink rate. The ground-roll phase begins after
touchdown with the objective of bringing the aircraft to a stop. To minimize
the ground-roll distance, the total retarding force acting on the aircraft must be
maximized. The retarding force may consist of brake application, drag from a
drag chute and=or speed brakes, and reverse thrust, in addition to the normal
drag of the aircraft. Pilot techniques are also important during the ground roll.
For example, on some aircraft, holding full aft stick during the ground roll
provides a favorable tradeoff between increased aircraft drag and reduced
download on the main gear.
The forces during landing ground roll include those discussed for takeoff in
Sec. 3.4.2 and presented in Fig. 3.8. For landing, the rolling friction coefficient
(mr) becomes much larger because of the application of brakes ( 0:5 for a
dry concrete runway with the brakes fully applied), the drag (D) may become
significantly larger because of speed brakes and=or a drag chute, and the
aircraft thrust will be a small value or negative (if thrust reversing is used).
Referring to Eq. (3.23) with the assumption of a level runway (j ¼ 0), we
have
a x  g
W ½T  D  mrðW  LÞ
Because we will have a deceleration, rather than an acceleration, during the
landing ground roll, we will recast the above equation to emphasize decelera-
tion with a negative sign at the beginning of the equation.
ax   g
W ½T þ D þ mrðW  LÞ
Again, if thrust reversing is used, T is less than zero (T < 0) and the decelera-
tion is larger (a x more negative). We can estimate the ground roll distance
ðS Gground
roll
with the following equation:
S Glanding ¼
ð0
VTD
V
a x
dV
which is similar to the approach we took for takeoffs. Recall from Eqs. (1.36)
and (1.32) that
D ¼ C D qqS ¼ ðCD0 þ KC2
LÞqqS
and
L ¼ C L qqS
where qq ¼ 1
2 rV 2 .
AIRCRAFT PERFORMANCE 	101

-- 117 of 650 --

Combining, we have
S Glanding ¼
ð0
VTD
V
 g
W ½T þ D þ mrðW  LÞ
dV
¼
ð0
VTD
V
 g
W T þ CD 1
2 rV 2
 	S þ mr W  CL 1
2 rV 2
 S
 		 	dV
and integrating,
SGlanding ¼ W
grSðCD  mr C LÞ ln 1 þ ðCD  mr CLÞrSV 2
TD
2ðT þ mr W Þ
 	
ð3:32Þ
Equation (3.32) can be used to estimate the landing ground roll during the
period of wheel braking. Remember that CD must include the effects of speed
brakes and=or a drag chute.
The previous analysis assumes that the thrust (or reversed thrust) is acting
parallel to the ground roll. The F-15 STOL=MTD test aircraft used two-dimen-
sional nozzles with thrust reversers that allowed a variable thrust angle with
upper and lower surface deflections. For landing ground roll, the upper surface
provided a maximized reverser angle, while the lower surface reverser angle
was reduced with velocity to prevent hot gas injestion. 2 In such a case, the
thrust inclination angle relative to the runway must be accounted for in the
development of Eq. (3.32).
3.5 	Gliding Flight
Consider an aircraft in a poweroff glide, as shown in Fig. 3.13. The forces
of lift, drag, and weight are acting on the aircraft.
Recall, the flight path angle (g) is defined as the angle between the horizon
and the relative wind—in this case it is a negative angle (V1 is below the hori-
zon). To avoid confusion, we will define gg as the magnitude of the angle.
g ¼ gg
Fig. 3.13 	Poweroff gliding flight.
102 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 118 of 650 --

We will assume straight (but not level) and unaccelerated gliding flight.
Summing forces parallel and perpendicular to the relative wind or flight path,
the equations of motion for gliding flight are obtained. Note that both the
linear and centripetal acceleration terms are zero.
SFparallel ¼ m dV
dt ¼ W sin gg  D ¼ 0
or
sin gg ¼ D
W
SFperpendicular ¼ m V 2
r ¼ W cos gg  L ¼ 0
or
cos gg ¼ L
W
Combining the two results, the following is obtained:
tan gg ¼ sin gg
cos gg ¼ D
L ð3:33Þ
We can derive an expression for glide range using the geometry of a glide as
shown in Fig. 3.14.
From the geometry shown,
tan gg ¼ H
R ð3:34Þ
Fig. 3.14 	Geometry of a glide.
AIRCRAFT PERFORMANCE 	103

-- 119 of 650 --

where H is the altitude at the start of the glide and R is the horizontal glide
range. From Eqs. (3.33) and (3.34), we can see that H=R ¼ D=L. The glide
range then is simply
R ¼ H L
D
 
ð3:35Þ
Not surprisingly, glide distance is a function of initial altitude. Also, by maxi-
mizing the lift-to-drag ratio, glide range is maximized. Therefore, a pilot
should fly at the airspeed (or, more correctly, the angle of attack) correspond-
ing to L=Dmax . From Sec. 3.3, this is the minimum drag point on the thrust
required curve.
Glide ratio is defined as R=H. It is horizontal distance covered, per decrease
in altitude—units are nondimensional. From the previous discussion,
R
H ¼ L
D ð3:36Þ
Therefore, an aircraft’s L=Dmax is also its maximum glide ratio. L=Dmax occurs
at Dmin on the drag vs velocity graph and, as can be seen from Fig. 1.57, para-
site and induced drag are equal at this point. Thus, C Do ¼ KC2
L at the condition
for maximum glide ratio.
Another important aspect of gliding flight is rate of descent. Obviously, if
this is minimized, time in the air (or endurance) is maximized. Consider Fig.
3.15.
We are interested in finding a relationship for the vertical velocity (Vv), or
rate of descent (also called sink rate). From the geometry shown before,
sin gg ¼ Vv=V1, or Vv ¼ V1 sin gg. Substituting for sin gg, from the equations of
motion developed in this section, gives the following:
rate of descent ¼ Vv ¼ V1 sin gg ¼ V1 ðD=W Þ ¼ PR=W 	ð3:37Þ
Fig. 3.15 	Velocity components for an aircraft in a glide.
104 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 120 of 650 --

Therefore, to minimize sink rate (or vertical velocity), the aircraft should be
flown at minimum power required (refer to Sec. 3.3). The max endurance for
gliding flight then can be conservatively estimated as
EmaxðglideÞ ¼ H
ðrate of descentÞmin
¼ WH
PRmin
ð3:38Þ
The CL and C D relationship associated with the rate of descent can be easily
developed with the assumption of a small glide angle (cos gg  1 and L  W )
as follows:
rate of descent ¼ Pr
W ¼ V D
W  V D
L ¼ V CD
C L
¼ CD
C L
ffiffiffiffiffiffiffiffiffiffiffi
2W
rSC L
s
rate of descent  CD
C3=2
L
ffiffiffiffiffiffiffi
2W
rS
s
Thus, to minimize the rate of descent, the aircraft should be flown at an angle
of attack (or C L) where the ratio C3=2
L =C D is a maximum. In addition, we can
use this to determine the relationship between parasite and induced drag at
C3=2
L =C DÞmax . Because
@ C3=2
L
CD
!
@CL
¼ 0 	@ C3=2
L
CD
!
max
Using the formula for the derivative of the quotient of two functions,
d u
v
 
¼ v du  u dv
v2
with u ¼ C3=2
L , and v ¼ CD, we have,
@ C3=2
L
CD
!
@CL
¼
3
2 ðC D0 þ KC2
LÞC1=2
L 	 C3=2
L ð2KC LÞ
ðC D0 þ KC2
LÞ2 	¼ 0
3
2
 
C D0 C1=2
L 	þ 3
2
 
KC5=2
L 	 2KC5=2
L 	¼ 0
3
2
 
C1=2
L CD0 ¼ 1
2
 
KC5=2
L 	ð3:39Þ
3CD0 ¼ KC2
L
AIRCRAFT PERFORMANCE 	105

-- 121 of 650 --

Thus, the induced drag is equal to three times the parasite drag at PRmin where
the rate of descent is a minimum and where endurance is maximized.
Referring to Fig. 3.16, glide performance is easily summarized on a power
required curve.
Please note that maximum glide range is achieved at a higher velocity than
minimum rate of descent.
Example 3.6
A T-37 has a drag polar C D ¼ 0:02 þ 0:057C2
L. Find its max glide ratio and
max glide range from 20,000 ft to sea level.
The max glide ratio occurs at L=DÞmax where CD0 ¼ KC2
L. Thus
R
H

max
¼ L
D

max
¼ CL
CD

max
¼
ffiffiffiffiffiffi
C D0
K
q
2CD0
¼ 1
2 ffiffiffiffiffiffiffiffiffiffiffi
KCD0
p 	¼ 1
2 ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
0:057ð0:02Þ
p 	¼ 14:8
The max glide range from 20,000 ft would be
R
H

max
¼ 14:8 ¼ R
20;000
R ¼ 14:8ð20;000Þ ¼ 296;000 ft ¼ 56:1 miles
Example 3.7
What is the maximum glide range a 12,000-lb T-38 can achieve from
20,000 ft? Use the T-38 performance charts.
Fig. 3.16 	Power required for an aircraft in a glide.
106 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 122 of 650 --

Because L=DÞmax occurs at Dmin , we use the 20,000 ft T-38 drag curve to
find
Dmin ¼ 1070 lb
and
R
H

max
¼ L
D

max
¼ W
Dmin
¼ 12;000
1070 ¼ 11:4
the max glide range is
R ¼ 11:4ð20;000Þ ¼ 228;000 ft ¼ 43:2 miles
Notice that this is approximately 13 miles shorter than for the T-37.
Example 3.8
Find the true airspeed for max range and max endurance for an unpowered
F-4 at 18,000 ft. W ¼ 45; 000 lb, CD ¼ 0:027 þ 0:209C2
L, S ¼ 530 ft 2 .
For max glide range
C D0 ¼ KC2
L
0:027 ¼ 0:209 C2
L
CL ¼
ffiffiffiffiffiffiffiffi
C D0
K
r
¼
ffiffiffiffiffiffiffiffiffiffiffi
0:027
0:209
r
¼ 0:359
The equation for the true airspeed at a given lift coefficient is
V ¼
ffiffiffiffiffiffiffiffiffiffiffi
2W
rSC L
s
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2ð45;000Þ
ð0:00136Þð530Þð0:359Þ
s
¼ 589:7 ft=s ¼ 348:9 kn
For max glide endurance
3CD0 ¼ KC2
L
3ð0:027Þ ¼ 0:209C2
L
CL ¼
ffiffiffiffiffiffiffiffiffiffi
3C D0
K
r
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
3ð0:027Þ
0:209
r
¼ 0:623
The true airspeed for max endurance becomes
V ¼
ffiffiffiffiffiffiffiffiffiffiffi
2W
rSC L
s
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2ð45;000Þ
ð0:00136Þð530Þð0:623Þ
s
¼ 447:7 ft=s ¼ 264:9 kn
AIRCRAFT PERFORMANCE 	107

-- 123 of 650 --

3.6 	Climbs
We will use the same approach with climb performance that we did with
glides. We identify the forces, make some simplifying assumptions, and deter-
mine the equations of motion. Consider Fig. 3.17.
The general forms of the equations of motion were derived in Sec. 3.2.
They are repeated next with parallel and perpendicular subscripts referring to
parallel and perpendicular to the flight path:
SFparallel ) m dV
dt
 	
¼ T cosðfT þ aÞ  D  W sin g
SFperpendicular ) m V 2
r
 	
¼ W cos g  L  T sinða þ fT Þ
We will assume a straight and unaccelerated climb. Also, we will assume the
following:
a þ fT  0 ½therefore; cosða þ fT Þ  1:0 and sinða þ fT Þ  0:0
g < 15 deg ½therefore; cos g  1:0
With these assumptions, the equations of motion reduce to
SFparallel ) sin g ¼ T  D
W
 	
; or g ¼ sin1 T  D
W
 	
ð3:40Þ
SFperpendicular ) L ¼ W 	ð3:41Þ
We can conclude that to obtain a maximum sustained climb angle (gmax ),
weight should be minimized and the aircraft should operate at maximum
excess thrust, ðT  DÞmax , as shown in Fig. 3.18.
An expression for an aircraft’s rate of climb (Vv or ROC) can be obtained
by considering Fig. 3.19 and the equations of motion.
Fig. 3.17 	Aircraft in a climb.
108 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 124 of 650 --

From the geometry, sin g ¼ Vv=V1, or Vv ¼ ROC ¼ V1 sin g. Substituting
this result into Eq. (3.40), we obtain
rate of climb ¼ Vv ¼ V1
T  D
W
 	
¼ PA  P R
W ¼ excess power
weight ð3:42Þ
Therefore, maximum rate of climb occurs at maximum excess power, as illu-
strated on the power curves in Fig. 3.20. Note the graphical technique for
locating this point if PA is a straight line.
Example 3.9
An 8000-lb T-38 is in a steady climb at 10,000 ft and 0.5 Mach. Determine
the rate of climb for military (Mil) and max thrust. Also, determine the climb
angle if using max thrust.
Using Eq. (3.40) and the T-38 performance chart for 10,000 ft, mil power
and 8000 lb, we have,
rate of climb ¼ V1
T  D
W
 	
¼ Ma 3280  800
8000
 	
Fig. 3.18 	Determination of Vgmax from thrust vs velocity graph.
Fig. 3.19 	Velocity components for an aircraft in a climb.
AIRCRAFT PERFORMANCE 	109

-- 125 of 650 --

The standard atmosphere speed of sound at 10,000 feet is 1077.4 ft=s. Thus,
ROC Mil
Power
¼ ð0:5Þð1077:4Þ 3280  800
8000
 	
¼ 167:0 ft=s
For max thrust,
ROC Max
Power
¼ ð0:5Þð1077:4Þ 5200  800
8000
 	
¼ 296:3 ft=s
We can determine the max thrust climb angle using Eq. (3.40).
g ¼ sin1 T  D
W
 	
¼ sin1 5200  800
8000
 	
¼ 33:4 deg
Of course, this climb angle violates the assumption of a climb angle less than
15 deg which is used to develop Eq. (3.40), so it is not an exact answer. To
obtain an exact answer, the equations should be iterated with L ¼ W cos g.
3.7 	Endurance
Aircraft endurance is measured in terms of time, and quantifies how long an
aircraft can remain airborne based on a given amount of fuel available. Endur-
ance considerations have a high priority in the design of aircraft that must
loiter as part of their mission requirements. The A-10, for example, had a 2-h
loiter time requirement in its original design mission profile so that it could
remain in a combat area and provide close air support quickly in response to a
ground request. Endurance is also important for aircraft such as the E-3A
AWACS and KC-135=KC-10 tankers, which must maximize time on station. In
Fig. 3.20 	Determination of max rate of climb airspeed.
110 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 126 of 650 --

simple terms, maximizing endurance simply consists of flying at a throttle
setting that minimizes fuel flow and allows the aircraft to maintain altitude.
After a few moments of thought, it should become apparent that the minimum
fuel flow required to maintain altitude goes down as the weight of the aircraft
decreases because the induced drag portion of thrust required decreases. Thus,
to really quantify the endurance of an aircraft, we must evaluate the aircraft
over the applicable weight excursions as fuel is burned. Fortunately, a simple
integration allows us to do this and the equations are fairly straightforward.
3.7.1 	Specific Endurance
In quantifying endurance, we begin with the concept of specific endurance
(SE). Specific endurance is endurance, in terms of time, normalized with
respect to fuel burned. It can be thought of, for any short period of time
during the mission, as time airborne per pound of fuel consumed or
SE ¼ time airborne
fuel consumed ð3:43Þ
Figure 3.21 presents a simple way of looking at specific endurance. If the
endurance of an aircraft is plotted as a function of the fuel consumed, specific
endurance can be thought of as the slope of the curve at any point during the
mission. It can be seen that, as the weight of the aircraft decreases because of
fuel burned, the specific endurance increases.
A more useful form of the specific endurance equation is cast in terms of
fuel flow,
SE ¼ 1
fuel flow ¼ 1
_W	W f
ð3:44Þ
Fig. 3.21 	Typical endurance relationship.
AIRCRAFT PERFORMANCE 	111

-- 127 of 650 --

where fuel flow rate generally has units of pounds per hour or pounds per
second. As we saw in Chapter 2, _W	Wf can be expressed in terms of thrust-speci-
fic fuel consumption (TSFC). Recall TSFC is equal to
TSFC ¼ ðlb of fuelÞ
ðhÞðlb of thrustÞ ¼ h1 ¼ ðTSFCsea levelÞ ffiffiffi
y
p ð3:45Þ
_W	W f ¼ lb of fuel
h ¼ ðTSFCÞTA ffi ðTSFCÞTR 	ð3:46Þ
and, with the assumption of level flight where thrust available is approximately
equal to thrust required, we have
SE ¼ 1
ðTSFCÞTR
ð3:47Þ
It is important to remember that specific endurance applies to a moment in
flight for an aircraft, and will vary with temperature (because TSFC varies with
temperature), altitude (density), aircraft velocity, and aircraft weight (because
TR varies with these three parameters). Also notice that specific endurance
does not include the amount of fuel available.
Theoretically, the velocity for maximizing specific endurance is at the mini-
mum drag or L=Dmax point (as will be shown in the next section). This is
based on the level flight simplifying assumptions that L ¼ W and T ¼ D. In
reality, because the thrust vector is generally inclined slightly above the flight
path and helps to overcome some of the weight, the velocity for maximizing
specific endurance is slightly lower than the velocity for minimum drag. Thus,
control of the aircraft is more challenging because this is in the region of
reverse command (stabilizing at a lower velocity requires more thrust). As a
matter of practicality, operational procedures generally dictate flying at the
velocity for minimum drag and accepting a small penalty in endurance. For the
purposes of this text, we will assume maximum endurance occurs at minimum
drag.
Evaluation of endurance during flight test is typically accomplished by
flying cruise (stabilized) points across the velocity range of the aircraft at
constant values of W =d to standardize weight and altitude variations. Quasi-
steady maneuvers (level accelerations and decelerations) may also be used, 3
however, generally stabilized or trim points are still used to spot check the
data. To maintain W =d constant, altitude is increased as fuel is burned. Fuel
flow is recorded at each point along with temperature, velocity, and pressure
altitude. Corrected fuel flow can then be calculated along with the specific
endurance parameter (SEP), which is the reciprocal of corrected fuel flow,
d ffiffiffi
y
p = _W	W f . A plot, such as that presented in Fig. 3.22, is prepared for several
112 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 128 of 650 --

values of W =d, so that the maximum SEP can be determined as a function of
Mach number or true airspeed along with W =d.
Another way to present the data is with the plot presented in Fig. 3.23.
Notice that the minimum corrected fuel flow line, which indicates the condi-
tions to maximize specific endurance, falls to the left of the minimum drag
point, as discussed earlier. Fortunately, we will see that maximizing endurance
from the pilot’s standpoint is much easier than this. There is one angle of
attack that corresponds to maximum endurance for level flight.
Knowing an aircraft’s specific endurance, makes it relatively easy to estimate
total endurance. We will take two approaches: 1) an average value equation,
and 2) the Breguet endurance equation.
Fig. 3.22 	Typical specific endurance parameter plot.
Fig. 3.23 	Corrected thrust vs Mach number.
AIRCRAFT PERFORMANCE 	113

-- 129 of 650 --

3.7.2 	Average Value Endurance Equation
Recall that specific endurance applies to a moment in flight for an aircraft.
Knowing the available fuel, an aircraft’s endurance can be estimated by the
following equation:
EAVG ffi SEðW0  W1Þ ffi 1
ðTSFCÞTR
ðW0  W1Þ 	ð3:48Þ
Called the ‘‘average value endurance equation,’’ W0 is the aircraft’s initial
weight and W1 is the final weight. The difference is the amount of fuel avail-
able for the endurance mission. The equation says that endurance is improved
by 	maximizing 	available 	fuel 	and 	minimizing 	both 	thrust-specific 	fuel
consumption and thrust required (or drag). This makes sense. Sometimes the
equation is written in the following form, particularly if thrust curves are avail-
able.
EAVG ffi 1
ðTSFCÞDAVG
ðW0  W1Þ ffi DW f
ðTSFCÞDAVG
ð3:49Þ
DW f is the available fuel and DAVG is the drag (or thrust required) at the aver-
age weight of the aircraft during the endurance mission. The following exam-
ple shows how to use these equations to estimate endurance. Because TSFC is
typically presented in units of h1 , endurance has the units of hours—DW f and
DAVG are in units of pounds.
Example 3.10
Determine the average value endurance for a T-38 at 20,000 ft with an initial
weight of 10,000 lb and 2000 lb of fuel flying at 0.5 Mach. TSFC is 1.01=h.
Using the T-38 performance charts, the drag at 0.5 Mach for a 10,000-lb
T-38 is 900 lb. At 8,000 lb, the drag is 675 lb. Using this and Eq. (3.49), we
have
EAVG ffi DW f
ðTSFCÞDAVG
¼ 2000
ð1:01Þ 900 þ 675
2
 	 ¼ 2:51 h
3.7.3 	Breguet Endurance Equation
Mathematically, endurance is simply equal to the following. We are inter-
ested in determining the total time an aircraft can stay aloft.
E ¼
ðt1
t0
dt
114 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 130 of 650 --

where time t0 is the start of the endurance mission; t1 is the end. Recall, that
the rate of fuel flow ð _W	W f Þ, is simply the change in the aircraft’s weight per unit
time, or
_W	W f ¼  dW
dt
Solving for dt, and using the definition of specific endurance ðSE ¼ 1= _W	W f Þ,
endurance can be recast in the following form:
E ¼
ðt1
t0
dt ¼
ðW1
W0
dW
_W	W f
¼
ðW1
W0
SE dW ¼
ðW1
W0
dW
ðTSFCÞTA
¼
ðW0
W1
dW
ðTSFCÞTA
Let us work on thrust available (TA). If we assume straight, level, and unaccel-
erated flight (SLUF), then
ð1Þ TA ¼ TR ¼ D
ð2Þ L ¼ W
Therefore, TA ¼ D ¼ ðD=LÞW ¼ ðCD=C LÞW
Let us also assume TSFC (fixed altitude and throttle setting) and angle of
attack (a) are constant—a constant angle of attack implies a constant ratio of
CD=C L. With these assumptions, our endurance equation is modified as
follows:
E ¼ 1
TSFC
CL
C D
 	 ðW0
W1
1
W dW ¼ 1
TSFC
CL
CD
 	
‘n W0
W1
ð3:50Þ
This is the Breguet endurance equation. Physically it says the same thing as
the average value equation. Aircraft endurance is maximized by minimizing
TSFC (fly at high altitude) and maximizing the lift-to-drag ratio and available
fuel.
Example 3.11
A T-37 at 20,000 ft has a drag polar of CD ¼ 0:02 þ 0:057C2
L. The aircraft
has an initial weight of 6000 lb and 500 lb of usable fuel. If the TSFC at sea
level is 0.9 =h, find the max endurance.
To maximize endurance, the aircraft must fly at L=DÞmax which was
previously determined from the drag polar to be 14.8 in Example 3.6. We will
use Eq. (3.50) to determine the endurance, but first we must find the TSFC at
20,000 ft using Eq. (3.45).
TSFC ¼ TSFC sea
level
ffiffiffi
y
p ¼ 0:9 ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
0:8625
p ¼ 0:836=h
AIRCRAFT PERFORMANCE 	115

-- 131 of 650 --

We can now find the max endurance using Eq. (3.50).
E ¼ 1
TSFC
CL
C D
 	
‘n W0
W1
¼ 1
0:836 ð14:8Þ ‘n 6000
5500 ¼ 1:54 h
Notice that the units for endurance in this problem are hours. If the TSFC
would have had units of 1=min, the units for endurance would have been
minutes.
3.8 	Range
Aircraft range is measured in terms of distance, and quantifies how far an
aircraft can fly based on a given amount of fuel available. Range considerations
will generally be a high priority requirement in the design process for all
aircraft. Transport aircraft such as the C-17 and bombers such as the B-2 had
very exacting range requirements based on the need to meet global require-
ments. The range capability of modern aircraft has improved considerably over
the years because of significant improvements in engine technology and aero-
dynamic design. In fundamental terms, maximizing range simply consists of
flying at a throttle setting that maximizes the ratio of distance traveled to fuel
consumed and that allows the aircraft to maintain altitude. With a little reflec-
tion, the ratio of distance traveled to fuel consumed is the same as the ratio of
true airspeed to fuel flow ( _W	W f ). Because the weight of the aircraft decreases as
fuel is burned, induced drag decreases as a flight progresses and the fuel flow
required to maintain altitude also goes down. Thus, to quantify the range of an
aircraft, we must evaluate the aircraft over the applicable weight excursions as
fuel is burned, similar to the approach taken for endurance.
3.8.1 	Specific Range
In quantifying range, we begin with the concept of specific range (SR).
Specific range is range, in terms of distance, normalized with respect to fuel
burned. Like specific endurance, it should be thought of as the ratio of distance
traveled to fuel consumed during any short period of time during the mission.
Figure 3.24 presents a simple way of looking at specific range. Specific range
Fig. 3.24 	Typical range relationship.
116 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 132 of 650 --

can be thought of as the slope of the curve at any point during the mission. As
the weight of the aircraft decreases because of fuel burned, the specific range
increases.
A more useful form of the specific range equation is cast in terms of velo-
city and fuel flow,
SR ¼ distance traveled
fuel consumed ¼ V
_W	W f
ð3:51Þ
Because _W	W f can be expressed in terms of thrust-specific fuel consumption as
_W	W f ¼ lb of fuel
h ¼ ðTSFCÞTA ffi ðTSFCÞT R
we can express specific range as
SR ¼ V
_W	W f
¼ V
ðTSFCÞTR
ð3:52Þ
with the assumption of level flight where thrust is approximately equal to
thrust required. It is important to note that V in the above relationship is true
airspeed and that specific range applies to a moment in flight. Specific range
will vary with the same parameters as specific endurance, namely, temperature,
altitude, velocity, and weight. Specific range does not include the amount of
fuel available.
For level flight with the assumption of T ¼ D and L ¼ W, the velocity for
maximizing specific range can be determined using a thrust required vs
velocity plot as presented in Fig. 3.25. Assuming TSFC is a fixed value, SR
can be maximized by maximizing V =TR. Notice that the slope of a line origi-
nating at the origin and intersecting the thrust required curve is the reciprocal
of this, or T R=V. Thus, the velocity to maximize SR can simply be found by
drawing the line tangent to the curve as shown. In reality, because inclination
of the thrust vector and winds must be considered, the velocity to maximize
specific range will be near this point but not exactly at it.
Fig. 3.25 	Typical thrust required vs velocity plot.
AIRCRAFT PERFORMANCE 	117

-- 133 of 650 --

Evaluation of range during flight test is generally accomplished using the
same cruise (stabilized) points as those discussed for endurance. Constant
values of W =d are flown to standardize weight and altitude variations, and the
same parameters are recorded at each point. The specific range parameter
(SRP) is calculated with the following relationship,
SRP ¼ V d
_W	W f
ð3:53Þ
and plotted vs Mach number or true airspeed, as presented in Fig. 3.26 so that
the maximum SRP can be determined as a function of Mach and W=d.
As with endurance, we will see that maximizing range from the pilot’s
standpoint is fairly easy. There is also one angle of attack (lower than that for
endurance) that corresponds to the max range condition for level flight.
3.8.2 	Average Value Range Equation
Like we did in our discussion of endurance, we can develop an average
value equation to estimate an aircraft’s range. Range is simply aircraft velocity
times endurance, or:
R ¼ E  V1 	ð3:54Þ
Note that endurance is typically presented in hours, so be careful with the units
of freestream velocity, V1. Substituting in our expression for average endur-
ance, the following is obtained—recall, DAVG is the drag (or thrust required),
at the average weight of the aircraft, during the mission.
RAVG ¼ EAVG  V1 ¼ DW f
ðTSFCÞDAVG
 V1 ¼ DWf
ðTSFCÞðDAVG=V1 Þ ð3:55Þ
Fig. 3.26 	Typical specific range parameter plot.
118 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 134 of 650 --

Like endurance, maximizing available fuel and minimizing TSFC will increase
range. However, now the ratio of DAVG=V1 (not simply DAVG ) should be mini-
mized to maximize range. On a thrust curve, the airspeed to fly at ðDAVG=
V1 ÞMIN can be determined as shown in Fig. 3.27.
Recall, flying at minimum drag (or maximum L=D) will maximize endur-
ance. The airspeed to achieve maximum range is higher than that for maximum
endurance.
Example 3.12
Determine the average value range for a T-38 at 20,000 ft with an initial
weight of 10,000 lb and 2000 lb of fuel flying at 0.5 Mach. The TSFC is
1.01=h.
These are the same conditions as in Example 3.10 except that range must
be determined. We will use Eq. (3.55) and the same drag values determined in
Example 3.10.
V1 ¼ Ma ¼ 0:5ð1036:8Þ ¼ 518:4 ft=s
RAVG ¼ EAVG  V1
¼ ð2:51 hÞð3600 s=hÞð518:4 ft=sÞ ¼ 4;684;262 ft ¼ 887:2 miles
Notice that with the Mach specified at 0.5, this is not the max range for the
aircraft under these altitude and weight conditions because Mach 0.5 is not the
max range Mach at the tangent to the drag curve. Notice also that we need to
be careful with units when calculating range. Endurance is usually calculated
in hours while range usually has units of feet.
3.8.3 	Breguet Range Equation
In this section, we will derive a general equation for the range of a jet air-
craft in powered cruise—the result will be in an integral form. We will evaluate
it for two specific cases—constant altitude cruise and constant speed cruise.
Fig. 3.27 	Thrust required vs velocity graph for aircraft average weight.
AIRCRAFT PERFORMANCE 	119

-- 135 of 650 --

We will start by obtaining a differential expression for distance (ds)
traveled.
V ¼ ds
dt ) ds ¼ V dt
We will find an expression for dt in the previous equation. Recall, aircraft
weight is decreasing as fuel is burned—the rate flow of fuel ð _W	W f ) is typically
presented in pounds per hour.
_W	W f ¼ dW
dt ) dt ¼ dW
_W	W f
¼ dW
ðTSFCÞTA
Therefore,
ds ¼ V dt ¼ V dW
ðTSFCÞTA
 	
We will now integrate the previous equation. At the start of the range mission,
s is zero and the aircraft weight is W0 . At the end of the mission, s is R (for
range), and the aircraft weight is W1 . The difference between W0 and W1 is the
fuel burned during the mission, or DW f .
ðS1 ¼R
S0
ds ¼ 
ðW1
W0
V dW
ðTSFCÞTA
¼
ðW0
W1
V dW
ðTSFCÞTA
¼
ðW0
W1
V
ðTSFCÞT A
 	
dW ¼ R
The term in the bracket is simply specific range (refer to Sec. 3.8.1). Therefore,
the previous equation is equivalent to
R ¼
ðW0
W1
ðSRÞ dW
This is the general range equation. We will next examine how to maximize
cruise range. Assuming TSFC is some fixed value (constant altitude and throt-
tle setting), maximizing the ratio of V =TA will maximize R—this is equivalent
to minimizing TA=V (or D=V, because T A  TR ¼ D). This is the same result
we obtained during our discussion of the average value range equation, namely
fly at ðD=V ÞMIN to maximize range.
Now, we will expand the general range equation by using the relationships
for straight, level, unaccelerated flight.
T A ¼ D ¼ C D q1S W
L
 	
¼ ðCD q1SÞW
CL q1S ¼ C D
CL
 	
W
L ¼ W ¼ C L q1S ¼ C L
1
2 r1V 2
1S ) V1 ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2W
r1CL S
s
120 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 136 of 650 --

Therefore, the general range equation can be expressed as
R ¼
ðW0
W1
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2W
r1CL S
s
1
TSFC
 	 C L
CD
 	 1
W
 	
dW
R ¼
ðW0
W1
ffiffiffiffiffiffiffiffiffi
2W
r1S
s
1
TSFC
 	 C1=2
L
C D
!
1
W
 	
dW
ð3:56Þ
Ignoring all terms except CL and CD, we see that range is maximized by flying
at the angle of attack (and velocity) to maximize the ratio of C1=2
L =C D, that is
ðC1=2
L =C DÞMAX . It can be shown that this ratio is maximized at ðD=V ÞMIN ,
precisely the same point on a thrust required curve as discussed in Sec. 3.8.2.
Additionally, refer to Problem 3.9, which states that the relationship between
parasite and induced drag at this point is
C D0 ¼ 3KC2
L 	ð3:57Þ
Because parasite drag is three times induced drag, we know that this is a faster
velocity than we would fly for minimum drag. Recall that L=Dmax occurs at
Dmin , where parasite and induced drag are equal.
Now we are ready to evaluate Eq. (3.56). Once again, we will take two
approaches.
3.8.3.1 	Constant altitude cruise. 	For convenience, a form of the general
range equation is repeated next. We will evaluate it for the special case of a
constant altitude cruise.
R ¼
ðW0
W1
ffiffiffiffiffiffiffiffiffi
2W
r1S
s
1
TSFC
 	 C1=2
L
CD
!
1
W
 	
dW
Our simplifying assumptions are
1) A constant altitude implies constant density, r1.
2) Because lift and drag coefficients are functions of angle of attack, C L and
C D are also constant.
3) TSFC is a constant.
AIRCRAFT PERFORMANCE 	121

-- 137 of 650 --

With these assumptions, our range equation is simplified to the following,
called the Breguet range equation:
R ¼
ffiffiffiffiffiffiffiffiffi
2
r1S
s
1
TSFC
 	 C1=2
L
CD
! ðW0
W1
dW
ffiffiffiffiffi
W
p
R ¼
ffiffiffiffiffiffiffiffiffi
2
r1S
s
2
TSFC
 	 C1=2
L
CD
!
ð ffiffiffiffiffiffi
W0
p  ffiffiffiffiffiffi
W1
p Þ
ð3:58Þ
We can conclude that range is maximized by flying high (low density and low
TSFC), maximizing available fuel, and maximizing the ratio of C1=2
L =C D.
Unfortunately, there are a few limitations to this equation:
1) Flight test data shows that TSFC may actually increase (instead of decrease)
above 50,000 ft. However, aircraft typically operate below this altitude.
2) As fuel is burned, weight decreases. To maintain a constant angle of attack
(or lift coefficient), airspeed must be decreased. Therefore, the pilot will
retard the throttle, which may violate our constant TSFC assumption.
In the next section, an example is worked demonstrating use of Eq. (3.58).
Readers are cautioned to watch units and keep TSFC in the consistent units of
1=s.
3.8.3.2 	Constant speed cruise (cruise climb). 	We will start from the
general range equation, repeated next. In this section, we will evaluate it for the
case of a cruise climb. In this technique, weight is traded (as fuel is burned) for
altitude.
R ¼
ðW0
W1
V
ðTSFCÞTA
 	
dW
In this method, we will assume the following:
1) Constant velocity.
2) Constant angle of attack—again, this implies CL and C D are constant.
3) TSFC is a constant.
With these assumptions, the previous equation reduces to:
R ¼ V
TSFC
ðW0
W1
dW
TA
122 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 138 of 650 --

Referring to Sec. 3.8.3, we can once again (assuming straight, level, unacceler-
ated flight) replace thrust available and velocity with the following:
T A ¼ CD
C L
 	
W
V ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2W
r1C L S
s
Continuing, range for a cruise climb mission can be expressed as
R ¼ V
TSFC
ðW0
W1
C L
C D
 	 dW
W ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2W
r1C L S
s
1
TSFC
C L
CD
ðW0
W1
dW
W
Integrating the previous equation yields
R ¼
ffiffiffiffiffiffiffiffiffi
2W
r1S
s
1
TSFC
C1=2
L
C D
ln W0
W1
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2
S
W
r1
 		s
1
TSFC
C1=2
L
CD
ln W0
W1
ð3:59Þ
For velocity to remain constant, ðW =r1 Þ must be kept constant—the aircraft
climbs as weight decreases.
Examining our final equation, range is maximized in a cruise climb by
maximizing fuel, flying high (low density and TSFC), and maximizing the
ratio of C1=2
L =C D. It is interesting to note that these are the same conclusions
we reached when flying a constant altitude cruise. As in the first method,
assuming a constant TSFC introduces some error. Although a constant throttle
setting is maintained, TSFC will decrease as altitude increases.
Although both range missions (constant altitude and cruise climb) introduce
some error, they do provide good insight into how range is maximized. Which
method gives the best range performance? The answer is a cruise climb. The
following example, using both methods, will demonstrate this.
Example 3.13
Using the information in Example 3.11 for the T-37 and S ¼ 184 ft 2
, deter-
mine the max range for the T-37 at 20,000 ft using a constant altitude cruise
and a cruise climb.
We first must determine C1=2
L =C DÞmax using Eq. (3.57). Because
C D0 ¼ 3KC2
L
we have
C L ¼
ffiffiffiffiffiffiffiffi
CD0
3K
r
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
0:02
3ð0:057Þ
s
¼ 0:342
and
C D ¼ C D0 þ KC2
L ¼ 0:02 þ 0:057ð0:342Þ2 ¼ 0:0267
AIRCRAFT PERFORMANCE 	123

-- 139 of 650 --

Thus,
C1=2
L
CD
!
max
¼ ð0:342Þ1=2
0:0267 ¼ 21:9
Next, to maintain consistent units, we will convert TSFC to units of 1=s.
TSFC ¼ 0:836=h ¼ 0:836 h
3600 s
 	
¼ 0:000232=s
We will evaluate the constant altitude cruise first using Eq. (3.58).
R ¼
ffiffiffiffiffiffiffiffiffi
2
r1S
s
2
TSFC
 	 C1=2
L
CD
!
ð ffiffiffiffiffiffi
W0
p  ffiffiffiffiffiffi
W1
p Þ
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2
ð0:001267Þð184Þ
s
2
0:000232
 	
ð21:9Þð ffiffiffiffiffiffiffiffiffiffi
6000
p  ffiffiffiffiffiffiffiffiffiffi
5500
p Þ
¼ 1;823;529 ft ¼ 345 miles
Finally, we will evaluate the cruise climb, which begins at 20,000 ft, using Eq.
(3.59) and recalling that W =r stays constant as the aircraft is performing the
climb.
R ¼
ffiffiffiffiffiffiffiffiffi
2W
r1S
s
1
TSFC
C1=2
L
CD
ln W0
W1
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2ð6000Þ
ð0:001267Þð184Þ
s
1
0:000232 ð21:9Þ ln 6000
5500
 	
¼ 1;863;483:6 ft ¼ 352:9 miles
Notice that approximately 8 more miles are obtained with the cruise climb.
3.8.4 	Range Factor Method
Another method to quantify the range of an aircraft during flight test
involves the parameter range factor (RF). RF is defined as
RF ¼ ðSRÞW ¼ VW
_W	W f
ð3:60Þ
124 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 140 of 650 --

It proves useful because it can be calculated from stabilized point flight test
data and used in a direct calculation of the cruise climb range equation devel-
oped in the previous section. Recalling that
R ¼ 
ðW1
W0
ðSRÞ dW
We can recast this equation in terms of RF by multiplying through by one, in
the form of: W =W .
R ¼ 
ðW1
W0
ðSRÞW dW
W
Or,
R ¼ 
ðW1
W0
RF dW
W ¼ RF ‘n W0
W1
 	
ð3:61Þ
Notice that the range of the aircraft for a given set of flight conditions is then
directly proportional to the RF. Because the RF can be obtained from stabilized
point (trimmed level flight) flight test data, we can determine the maximize
range for a given fuel load by maximizing the RF. However, we need a logical
flight test approach to determine the maximum RF for every altitude, airspeed,
and weight combination within the aircraft’s capabilities would have to be eval-
uated. Using Eq. (3.60) and the fact that
V ¼ Ma ¼ M ffiffiffiffiffiffiffiffiffi
gRT
p ffiffiffiffiffiffiffi
TSL
p
ffiffiffiffiffiffiffi
T SL
p 	¼ M ffiffiffi
y
p 	ffiffiffiffiffiffiffiffiffiffiffiffi
gRT SL
p
we see that
RF ¼ M ffiffiffi
y
p 	ffiffiffiffiffiffiffiffiffiffiffiffi
gRT SL
p W
_W	W f
d
d
 
¼ M 1
_W	W f
ffiffiffi
y
p d
2
6
6
6
4
3
7
7
7
5
W
d
ffiffiffiffiffiffiffiffiffiffiffiffi
gRTSL
p ð3:62Þ
This shows that RF is a function of three primary variables:
RF ¼ f 	M ; W
d
 	
; _W	W f
ffiffiffi
y
p d
!	" 	#
The flight test approach seeks to determine the optimal Mach and W =d to
obtain maximum RF. Several W =d values are chosen which are representative
of the aircraft’s capabilities. Stabilized points are flown at each constant value
of W =d across the Mach range of the aircraft. To hold W =d constant, the
AIRCRAFT PERFORMANCE 	125

-- 141 of 650 --

aircraft increases altitude as fuel is burned off. Specific range data are plotted
as a function of Mach for each value of W =d, as shown in Fig. 3.28.
The maximum specific range is then determined for each value of W =d as
shown. Two plots are next constructed using the maximum specific range
points as shown in Fig. 3.29. The optimal range factor plot is based on the
maximum specific range data multiplied by the weight of the aircraft for that
Fig. 3.28 	Specific range flight test data.
Fig. 3.29 	Determination of optimal W =d and Mach to maximize range.
126 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 142 of 650 --

particular flight condition. The peak of the optimal RF plot is then used to
determine the optimal W =d and Mach as shown.
The range of the aircraft can then be maximized by flying at the optimal
W =d (a cruise climb) and the optimal Mach.
3.9 	Turn Performance and V -n Diagrams
Until this point, we have assumed straight flight in all our discussions in
which the aircraft’s radius of curvature approached infinity. This is not the case
when examining turning performance. In this section, we will develop equa-
tions to estimate turn radius and turn rate (deg=s) for three specific cases:
level, pull-up, and pull-down. Additionally, we will introduce the concept of a
‘‘V -n diagram’’; this diagram describes, in terms of velocity and load factor, an
aircraft’s operating envelope.
3.9.1 	Fundamental Terminology
Consider an aircraft performing a turn, as shown in Fig. 3.30 (rear view).
The bank angle (F) is the angle between the horizon and the wing (or y body
axis; refer to Chapter 4). Typically, ailerons are used to control an aircraft’s
bank angle. Velocity and angle of attack (or lift coefficient) control the magni-
tude of the lift vector. Additionally, thrust, weight, and drag are also acting on
the airplane.
3.9.2 	Level Turns
The aircraft in Fig. 3.31 (rear view) is performing a level turn. To maintain
a constant altitude, the velocity vector must act in the horizontal plane; thus,
Fig. 3.30 	Aircraft in a turn.
AIRCRAFT PERFORMANCE 	127

-- 143 of 650 --

the vertical component of the lift vector must equal the weight. Summing
forces in the vertical direction,
SFvert ¼ 0 ¼ L cos F  W
W ¼ L cos F
L
W ¼ n ¼ 1
cos F
ð3:63Þ
where n is defined as the load factor. The load factor is generally referred to as
the number of gs that the aircraft is pulling. Equation 3.63 defines the relation-
ship between load factor and bank angle for a level turn. Note that the equation
is independent of aircraft type. Therefore, any aircraft in a sustained level
60-deg banked turn will be pulling 2 g.
Again referring to Fig. 3.31, we sum forces in the horizontal plane perpen-
dicular to the velocity vector and set them equal to the centripetal force (using
Newton’s 2nd law). From this geometry, we can derive expressions for turn
radius (R) and turn rate (o). From the Pythagorean theorem:
SFhoriz ¼ mV 2
R ¼ WV 2
gR ¼ L sin F ¼ ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
L2  W 2
p ¼ W ffiffiffiffiffiffiffiffiffiffiffiffiffi
n2  1
p
V 2
gR ¼ ffiffiffiffiffiffiffiffiffiffiffiffiffi
n2  1
p
Solving for the turn radius,
R ¼ V 2
g ffiffiffiffiffiffiffiffiffiffiffiffiffi
n2  1
p 	ð3:64Þ
Fig. 3.31 	Aircraft in a level turn.
128 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 144 of 650 --

Of course, the velocity we are referring to in Eq. (3.64) is the true airspeed of
the aircraft or V1. Because turn rate is simply equal to V1=R, an expression is
easily developed, as shown:
o ¼ V1
R ¼ V1
V 2
1
g ffiffiffiffiffiffiffiffiffiffiffiffiffi
n2  1
p
! ¼ g ffiffiffiffiffiffiffiffiffiffiffiffiffi
n2  1
p
V1
ð3:65Þ
Using consistent units in Eq. (3.65), the units of turn rate will fall out to be
radians per second. Because this is inconvenient, in terms of a physical inter-
pretation, turn rate is typically presented in degrees per second. If this is
desired, simply multiply the result of Eq. (3.65) by 57.3 deg=rad.
It is apparent, looking at the equations for turn radius and rate, that a
combination of low airspeed and high g loading will give the best level-turn
performance. This is also true for the next two cases: pull-up and pull-down.
Equations (3.64) and (3.65) do not tell us anything about the ability of the
aircraft to sustain the turn. Sustained turns require that sufficient thrust be
available to overcome the drag in the turn. Sustained turning capability can be
evaluated by calculating the aircraft drag for a given turning condition and
comparing it to the thrust available. Starting with Eq. (1.35), to sustain a turn,
the following relationship must be satisfied:
T Rturning
flight
¼ C D qqS ¼ 	CD0 þ C2
L
peAR
 	
qqS ¼ TAturning
flight
Because the lift coefficient in a turn is directly proportional to load factor,
CL ¼ nW
qqS ;
it is easy to see that the induced drag significantly increases in a turn and,
consequently, the thrust available must be sufficient to match the total drag or
the turn will not be sustained. Further analysis of sustained turning perfor-
mance involves the specific excess power characteristics of the aircraft. This
subject is addressed in Refs. 1 and 2.
Example 3.14
Determine the load factor, bank angle, and turn radius for an aircraft in a
level turn at a true airspeed of 120 kn and a turn rate of 15 deg=s.
We first convert the airspeed and turn rate to consistent units.
V1 ¼ 120 kn ¼ 120 1:69 ft=s
kn
 	
¼ 202:8 ft=s
o ¼ 15 deg=s ¼ 15 rad
57:3 deg
 	
¼ 0:262 rad=s
AIRCRAFT PERFORMANCE 	129

-- 145 of 650 --

From Eq. (3.65),
o ¼ g ffiffiffiffiffiffiffiffiffiffiffiffiffi
n2  1
p
V1
we can solve for load factor,
n ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
oV1
g
 	2
þ1
s
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ð0:262Þð202:8Þ
32:2
 	2
þ1
s
¼ 1:93
Equation (3.64) may be used to find the turn radius,
R ¼ V 2
1
g ffiffiffiffiffiffiffiffiffiffiffiffiffi
n2  1
p 	¼ ð202:8Þ2
32:2
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ð1:93Þ2  1
q 	¼ 773:8 ft
An easier alternate approach is to recognize that V1 ¼ Ro.
R ¼ V1
o ¼ 202:8
0:262 ¼ 774:0 ft
The bank angle is found from Eq. (3.63).
f ¼ cos1 1
n
 
¼ cos1 	1
1:93
 	
¼ 58:8 deg
3.9.3 	Pull-Ups
Assume an aircraft is in level flight at the bottom of a loop, as shown in
Fig. 3.32. At the start of the loop, the pilot pulls back on the stick initiating
the loop.
Fig. 3.32 	Aircraft in a pull-up.
130 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 146 of 650 --

Again, by applying Newton’s 2nd law in the centripetal force direction,
expressions for turn rate and radius can be derived as shown, where F? is the
force perpendicular to the velocity vector.
SF? ¼ m V 2
1
R
 	
¼ W
g
V 2
1
R
 	
¼ L  W ¼ nW  W ¼ W ðn  1Þ
Solving for turn radius and rate, the following is obtained:
R ¼ V 2
1
gðn  1Þ ð3:66Þ
o ¼ V1
R ¼ gðn  1Þ
V1
ð3:67Þ
Example 3.15
An F-22 is performing a 5-g pull-up at 10,000 ft and 500 kn true airspeed.
What is the turn rate and turn radius?
We begin by converting the airspeed to consistent units.
V1 ¼ 500 kn ¼ ð500Þ 1:69 ft=s
kn
 	
¼ 845 ft=s
We then use Eq. (3.67) to determine the turn rate,
o ¼ V1
R ¼ gðn  1Þ
V1
¼ 32:2ð5  1Þ
845 ¼ 0:152 rad=s
¼ 0:152 57:3 deg
rad
 	
¼ 8:71 deg=s
and Eq. (3.66) is used to determine the turn radius.
R ¼ V 2
1
gðn  1Þ ¼ ð845Þ2
32:2ð5  1Þ ¼ 5544 ft
3.9.4 	Pull-Downs
The aircraft is now inverted (avoiding negative gs) at the top of a loop as
shown in Fig. 3.33. Similar to the pull-up (except that lift is now in the same
direction as weight), we can derive expressions for turn rate and radius.
X F? ¼ m V 2
1
R
 	
¼ W
g
V 2
1
R
 	
¼ L þ W ¼ nW þ W ¼ W ðn þ 1Þ
AIRCRAFT PERFORMANCE 	131

-- 147 of 650 --

Solving for turn radius and rate, the following is obtained:
R ¼ V 2
1
gðn þ 1Þ ð3:68Þ
o ¼ V1
R ¼ gðn þ 1Þ
V1
ð3:69Þ
As you might expect, the inverted pull-down gives the best turning perfor-
mance because the weight of the aircraft is helping perform the turn (some-
times called ‘‘God’s g’’).
Example 3.16
An F-22 is at the same conditions (10,000 ft, 500 kn, and pulling 5 g) as in
Example 3.14. This time, the aircraft executes a pull-down. Compare the turn
rate and turn radius to that achieved for the pull-up.
From Example 3.15, we know the true airspeed in consistent units is
845 ft=s. We use Eq. (3.69) to determine the turn rate,
o ¼ V1
R ¼ gðn þ 1Þ
V1
¼ 32:2ð5 þ 1Þ
845 ¼ 0:229 rad=s ¼ 13:1 deg=s
and Eq. (3.68) to determine the turn radius.
R ¼ V 2
1
gðn þ 1Þ ¼ ð845Þ2
32:2ð5 þ 1Þ ¼ 3696 ft
In comparing these values with those for the pull-up (from Example 3.15), we
see that the turn rate is significantly higher and the turn radius is significantly
smaller. This leads to the correct conclusion that, with the same load factor
and airspeed, a pull-down will result in a quicker, tighter turn than a pull-up.
3.9.5 	V-n Diagrams
Most Air Force aircraft have a V -n diagram in the flight manual . . . the
limits are memorized by the pilots. In general, aircraft are limited in their
Fig. 3.33 	Aircraft in a pull-down.
132 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 148 of 650 --

performance 	capabilities by aerodynamics (for example, stall), 	structure,
and=or engine capabilities. A V -n diagram captures an aircraft’s operating
envelope. Before presenting the diagram, we will discuss aerodynamic and
structural limits.
As we have seen, aircraft are limited aerodynamically by stall. In Sec. 1.5,
we developed an equation for stall airspeed—it is repeated in Eq. (3.70),
except in a more general form where lift has been replaced by nW (earlier we
assumed a load factor of 1, or L ¼ W ).
VSTALL ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2nW
r1SC LMAX
s
ð3:70Þ
When pulling gs, an aircraft stalls at a higher airspeed—a V -n diagram will
show this trend. Additionally, an aircraft can withstand only a finite amount of
g loading until it structurally fails. This g loading is typically denoted by nmax.
At one airspeed, called the corner velocity, an aircraft is operating at the brink
of stall, and pulling max g (or maximum load factor), as defined:
Corner Velocity ¼ V 	¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2nmaxW
r1SC LMAX
s
ð3:71Þ
In our discussion of turns, we said that maximum performance is obtained at a
combination of low airspeed and high g loading . . . this is the corner velocity.
It is clear that this equation identifies both an aerodynamic (through the maxi-
mum lift coefficient) and a structural (through maximum load factor) limitation
for performance.
Figure 3.34 is a typical V -n diagram with velocity (or sometimes Mach
number) on the horizontal axis and load factor on the vertical axis.
Fig. 3.34 	Typical V-n diagram.
AIRCRAFT PERFORMANCE 	133

-- 149 of 650 --

The following are the key points about an aircraft’s V -n diagram:
1) A V -n diagram is good for one weight, altitude, and configuration.
2) The area inside is called the operating envelope in which the aircraft can be
safely operated at combination of airspeed and load factor.
3) Refer to the positive and negative stall limits—again, the higher the load
factor, the higher the stall airspeed. At a load factor of 1.0 (lift equal to
weight), the 1-g stall limit is quickly identified.
4) The corner velocity V 	is shown. It is at the corner of the aircraft’s stall
limit and structural limit.
5) A positive and negative limit load factor are identified—the aircraft will
sustain damage if these are exceeded. Structurally, an aircraft is typically
designed to handle more positive than negative gs (as is the pilot).
6) At the high airspeeds the aircraft reaches a ‘‘q limit,’’ or ‘‘redline.’’ Not as
straightforward, this could be an aeroelastic limit or a temperature limit.
Something undesirable, in terms of structure and handling qualities,
happens if this limit is exceeded.
7) The effects of changes in weight and altitude are shown in Figs. 3.35 and
3.36.
8) If equivalent velocity, Ve, is used on the horizontal axis of the V -n diagram,
then the V e-n diagram will not be affected by altitude changes.
Example 3.17
Determine the velocity and load factor that will result in the highest turn
rate and smallest turn radius for a 12,000-lb T-38 at 15,000 ft. Use the T-38
performance charts (V -n diagram).
Fig. 3.35 	Effect of weight on V-n diagram.
134 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 150 of 650 --

Using the T-38 V -n diagram for 12,000 lb, we see that
nmax ¼ 6
and that the corner velocity for 15,000 ft is 0.85 Mach. We convert the Mach
number to ft=s knowing that the speed of sound at 15,000 ft is 1057.4 ft=s.
V 	¼ Ma ¼ 0:85ð1057:4 ft=sÞ ¼ 898:8 ft=s
3.10 	Historical Snapshot
3.10.1 	Nordic Ski Jumping Aerodynamics
In the early 1990s, the Air Force Academy Aeronautics Department was
asked by the U.S. Ski Team to develop an aerodynamic database that would
support optimizing the glide ratio of Nordic ski jumpers. 4 The ‘‘V’’ technique,
where the jumper holds the tips of the skis apart to form a ‘‘V’’ during the free
flight, was just emerging as a preferred method in international competition. A
variety of configurations were evaluated in the Air Force Academy Subsonic
Wind Tunnel (see Fig. 1.59) using the 1 to 5.5 scale test model presented in
Fig. 3.37.
Variable configuration parameters included body camber, arm angle, ski=leg
angle, toe out angle, ankle angle, and binding position. Because a ski jumper
in flight is subject to the same aerodynamic forces as an aircraft (see Fig.
3.38), the overall objective of the effort was to find a combination of these
parameters that would maximize the lift-to-drag ratio of the jumper.
As discussed in Sec. 3.5, the glide ratio is directly proportional to the lift
over drag ratio. Wind tunnel results showed that the maximum glide ratio for a
jumper with parallel skis (no ‘‘V’’) was approximately 1.1. Figure 3.39 shows
that this could be increased to 1.25 with a 22.5 degree ‘‘toe out’’ of the skis,
which forms the conventional ‘‘V’’ configuration, as long as the ski=leg angle
was 10 deg. This represented a significant performance improvement (approxi-
Fig. 3.36 	Effect of altitude on V-n diagram.
AIRCRAFT PERFORMANCE 	135

-- 151 of 650 --

mately 13%) for Olympic competition. Indeed, this is the reason that virtually
every Nordic jumper now uses the ‘‘V’’ technique.
Another interesting result found during the testing was the influence of
ankle angle, a configuration change where the jumper rolls his ankles ‘‘arches
up.’’ A 20-deg ankle angle combined with the optimal 10-deg ski=leg angle,
and 22.5-deg toe out was found to have the potential to increase L=D to
approximately 1.7, which is a huge increase (see Fig. 3.40).
This configuration proved to be difficult physically for the jumpers to main-
tain because the skis were positioned at a very high value of lift. U.S. Ski
Team Olympic athletes were briefed on the results of the wind tunnel testing
Fig. 3.37 	Nordic ski jumper wind tunnel model.
Fig. 3.38 	Nordic ski jumper in flight.
136 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 152 of 650 --

Fig. 3.39 	L=D vs Alpha at M ¼ 0:2 for 22.5-deg toe out, arms down, no body camber
and various ski=leg angles.
Fig. 3.40 	L=D vs Alpha at M ¼ 0:2 10-deg skis, 22.5 toe out, arms down for various
ankle angles.
AIRCRAFT PERFORMANCE 	137

-- 153 of 650 --

and the recommended techniques were incorporated into their training in
preparation for the 1994 Olympics. The result was the highest finish ever by a
U.S. team.
3.10.2 	FB-111 Barrier Test Program
Aircraft arresting gear systems (normally called barriers) are common at
airports (air bases) with high-performance fighter aircraft. The landing distance
Fig. 3.41 	View of Dual BAK-12 from pit looking across the runway.
138 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 154 of 650 --

predicted by Eq. (3.32) is directly dependent on the rolling friction coefficient
(mr), which is dependent on the condition of the runway surface and the brak-
ing capability designed into the aircraft. This, combined with the relatively
high landing speeds of fighter aircraft, can result in situations where the aircraft
may run out of runway, especially in emergency situations. Most fighter aircraft
have tail hooks to engage an arresting gear system typically installed at each
end of a runway. An arresting gear system consists of a steel cable stretched
Fig. 3.42 	FB-111 test aircraft engaging Dual BAK-12 system.
Fig. 3.43 	Hookload vs time for FB-111=Dual BAK-12 test.
AIRCRAFT PERFORMANCE 	139

-- 155 of 650 --

across the runway and supported approximately 4-in. above the runway surface,
which is connected via a nylon tape to large energy absorbers (installed in pits
below ground) on each side of the runway. After the aircraft engages the cable
with the tail hook, the arresting gear system brings the aircraft to a stop within
900 to 1200 feet (for U.S. Air Force systems).
In the late 1960s, the emergence of the heavy weight FB-111 posed a chal-
lenge to existing Air Force arresting gear systems. The FB-111 had a maxi-
mum gross weight of 117,000 lb and could conceivably engage the barrier at
speeds as high as 170 kn. This energy level exceeded the capacity of existing
systems at the time. The Air Force’s response was to develop a system (called
the Dual BAK-12) with two energy absorbers on each side of the runway to
double the energy absorption capability (see Figs. 3.40 and 3.41).
A test program was conducted at the Air Force Flight Test Center, Edwards
Air Force Base, in the early 1970s to evaluate the FB-111’s compatibility with
the Dual BAK-12 system. 5 A total of 73 test engagements were performed,
one of which is shown in Fig. 3.42.
Figure 3.43 presents hookload data for one of the heavy weight tests.
Notice that the maximum hookload experienced is approximately 120,000 lb,
which is below the design limit strength of 147,000 lb.
The Dual BAK-12 system was deployed to FB-111 bases and successfully
supported the aircraft until its retirement from active service in the 1990s.
References
1 Brandt, S. A., Stiles, R. J., Bertin, J. J., and Whitford, R., Introduction to Aeronautics: A
Design Perspective, AIAA Education Series, AIAA, Reston, VA, 1997.
2 Blake, W. B., and Laughrey, J. A., ‘‘F-15 STOL=MTD Hot Gas Ingestion Wind Tunnel
Test Results,’’ AIAA TP 87-1922, June 1987.
3 Yechout, T. R., and Braman, K. B., ‘‘Development and Evaluation of a Performance
Modeling Flight Test Approach Based on Quasi Steady-State Maneuvers,’’ NASA Contrac-
tor Report 170414, April 1984.
4 Cutter, D. A., and Yechout, T. R., ‘‘Nordic Ski Jumping Aerodynamics,’’ AIAA TP 94-
0008, 32nd Aerospace Sciences Meeting, Reno, NV, Jan. 1994.
5 Yechout, T. R., ‘‘FB-111=Dual BAK-12 Arresting System Compatibility Tests,’’ Air
Force Flight Test Center TR TR-71-13, April 1971.
Problems
3.1 	A test pilot on the F-16XL test team is told by the contractor’s structural
engineers to fly at a constant 300 KEAS (knots equivalent airspeed) to
get the desired test points for the F-16XL’s flutter limits. The position
error correction is 10 kn for the F-16 at 300 KIAS.
(a) 	What indicated airspeed must be flown in knots to get data at
20,000-ft pressure altitude? (319 KIAS) (Assume Vcal ¼ Ve and iter-
ate).
(b) 	What type of velocity will the ground-based radar record when the
pilot is at the test point in part a and there is no wind? (V t ¼ Vg )
What if there is a wind? ( VVg ¼ VV t þ VV w).
140 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 156 of 650 --

(c) 	At what true velocity (in knots) must the pilot fly to conduct a test
point at 30,000 ft on a standard day? What about at 10,000 ft?
3.2 	Dynamic pressure is represented by q in the basic lift and drag equations.
Give an expression for q in terms of density (r) and true velocity (V ).
Also, show that q can be expressed in terms of Mach number (M) and
pressure (P), and it may be expressed in terms of density at sea level
(rSL) and equivalent airspeed (V e).
3.3 	On a standard day at 20,000 ft, if VE is 430 kn, what is the true velocity
and Mach number?
3.4 	Equation (3.23) is an expression for the acceleration of an aircraft during
the ground roll portion of a takeoff. Acceleration (expressed as a function
of time) can be integrated twice with respect to time to find the takeoff
distance. If the acceleration is assumed constant, the integration can be
done by hand. Otherwise, the integration involves calculating the accel-
eration at specific points in time to do a numeric integration. When the
acceleration is assumed constant, it is normally evaluated at V ¼ VLOF =	ffiffiffi
2
p . For an 11,000 lb f T-38 with 20 deg of flaps at sea-level standard
conditions, a friction coefficient of 0.025, and an optimal rolling CL, use
the maximum thrust available at sea level from the T-38 data to calculate:
(Assume aT ¼ 0, zero bank angle, CL opt ¼ 0:1).
(a) 	The ground roll (S G) for this T-38 by evaluating the acceleration at
V ¼ V LOF = ffiffiffi
2
p with no wind.
(b) 	The ground roll with a 15-mph headwind.
(c) 	The ground roll with a 15-mph tailwind.
3.5 	From Sec. 3.4.3, takeoff roll can be approximated by the following
expression—recall that acceleration is assumed constant:
S G ¼ V 2
G
2aa
For a KC-10 with the following characteristics, determine its takeoff
ground roll.
C L ¼ 0:2083 	C D ¼ 0:0543
W ¼ 590;000 lb f 	m ¼ 0:025
V LOF ¼ 280 ft=s 	Tð@V ¼ 280 ft=sÞ ¼ 39;500 lb f =eng
No runway slope 	Tð@V ¼ 0Þ ¼ 49;300 lbf =eng
S ¼ 3647:0 ft 2 	sea-level standard day
3 engines
AIRCRAFT PERFORMANCE 	141

-- 157 of 650 --

3.6 	Derive the equation for range in unaccelerated gliding flight, R ¼
HðL=DÞ:
(a) 	Draw a sketch of an aircraft in gliding flight (with flight path
angle), and show the three forces acting on it. Sum the forces paral-
lel and perpendicular to the flight path to obtain two equations that
are equal to zero (unaccelerated flight),
(b) 	Obtain a relationship for flight path angle in terms of altitude (H)
and range over the ground (R),
(c) 	Combine these equations to obtain range in terms of the forces
acting on the aircraft.
3.7 	Use the T-38 data to determine the maximum glide range (in nm) a
12,000-lb T-38 can attain from 10,000 ft to sea level.
3.8 	Sketch a thrust required curve and a power required curve and show
where ðL=DÞmax occurs on each curve.
3.9 	For a jet whose thrust is not a function of velocity, maximum range
occurs when C1=2
L =C D is a maximum. This occurs when
@ðC1=2
L =C DÞ
@CL
¼ 0 	Remember: d u
v
 
¼ v du  u dv
v2
(a) 	Show that CD0 ¼ 3KC2
L at ðC1=2
L =C DÞmax . Explain how this point is
found on a plot of drag vs velocity. (Hint: When taking the partial
derivative indicated, recall the drag polar equation for CD. Solve the
partial derivative for C D0 .)
(b) 	Show that C D0 ¼ 1=3KC2
L at ðC3=2
L =C DÞmax . Explain how this point
is found on a plot of power vs velocity.
3.10 An F-4 is in level flight at 18,000 ft on a standard day. The aircraft
weighs 45,000 lb f 	initially and is cruising at 510 kn true airspeed.
Assume you can use Eq. (1.30) to find C La . (This is not a perfect
assumption, as will be seen in Chapter 5).
q ¼ 506 lb f =ft 2 	S ¼ 530 ft 2 	AR ¼ 2:78
CD ¼ 0:027 þ 0:115C2
L 	a0L ¼ 0 o 	e ¼ 1
(a) 	What is the F-4’s angle of attack?
(b) 	What will be the F-4’s angle of attack if the pilot slows down to
cruise at 300 kn true airspeed at 18,000 ft on a standard day?
(c) 	Why did it increase or decrease?
142 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 158 of 650 --

3.11 Range and endurance. Fill in the blanks:
CðX Þ
L
CD
jmax 	C D0 ¼ ðY ÞC Di 	Glider: Max
Range or
Endurance
Jet: Max
Range or
Endurance
Velocity
Dmin
Pmin
ðD=V Þmin
Choose 	X ¼ 1=2,
1, 3=2
Y ¼ 1=3,
1, 3
Emax, Rmax,
or N=A
Emax, Rmax,
or N=A
Slowest,
middle,
fastest
3.12 Cruise performance. The following data apply to a turbojet aircraft:
C D ¼ 0:02 þ 0:057C2
L 	Initial weight ¼ 6000 lb
S ¼ 184 ft2 	TSFC ¼ c ¼ 1:25=h at sea level
Find the range for this jet at 30,000 ft if the pilot is flying for max range
and has 1000 lb of fuel available.
3.13 For the KC-10 with the following characteristics,
RFopt ¼ 12;100 NM 	ðW =dÞopt ¼ 1:75 	10 6 lb 	Mopt ¼ 0:81
determine the following:
(a) 	the altitude to fly for maximum range at a gross weight of
505,750 lb.
(b) 	the range of this KC-10 if it burns 100,000 lb of fuel.
(c) 	the time to fly this range at the Mach number for optimum W =d at
505,750 lb gross weight.
3.14 For a T-38 at 20,000 ft, answer the following questions:
(a) 	The subsonic drag polar equation (assuming no variation with
Mach) is: CD ¼ 0:015 þ 0:125C2
L. Find the maximum time the
aircraft can remain airborne if the pilot flies at maximum endurance.
Use the information from Appendix D and assume that the installed
military power TSFC applies and that the initial and final weights
are 10,000 and 8000 lb respectively. At what velocity will this
aircraft fly, and what will be its range at this flight condition?
(b) 	What is L=Dmax 	at 30,000 ft? Is it different than L=Dmax 	at
20,000 ft? Would there be a difference in maximum endurance time
AIRCRAFT PERFORMANCE 	143

-- 159 of 650 --

at 30,000 ft compared to 20,000 ft for the weights given in Part (a)?
If so, why? (No change in L=Dmax . Endurance changes).
3.15 The Fairchild A-10 has the following characteristics in flight at sea level.
CD0 ¼ 0:032 	S ¼ 505:9 ft 2 	Wt ¼ 28;000 lb f
e ¼ 0:87 	AR ¼ 6:5 	MaxTSL ¼ 9000 lb f =engine
(a) 	Find the velocity for maximum climb angle and the climb angle.
(b) 	Find the climb rate for this climb angle.
(c) 	Find the velocity for maximum cruise endurance.
(d) 	Find the velocity for maximum cruise range.
3.16 An F-16 is at 250 kn in a level 60-deg banked turn. Calculate the load
factor, turn rate, and turn radius.
3.17 Use the V -n diagrams in the T-38 data to answer the following:
(a) 	What is the corner velocity for a 9600 lb T-38 at 25,000 ft?
(b) 	What is nmax for a 12,000 lb T-38 at M ¼ 0:8 at sea level?
(c) 	What is nmax for a 12,000 lb T-38 at M ¼ 0:8 at 35,000 ft?
(d) 	Why are these two limits different in Parts (b) and (c)?
3.18 The following information is provided for a nonafterburning fighter at sea
level, static, standard-day conditions. Answer the following questions:
nmax ¼ 7:33 	T=W ¼ 0:40 	C Lmax ¼ 1:12
K ¼ 0:12 	W =S ¼ 60 lb f =ft 2 	C D0 ¼ 0:015
(a) 	Calculate the corner velocity.
(b) 	Find the minimum instantaneous turn radius for a level turn.
(c) 	Find the maximum instantaneous turn rate for a level turn.
(d) 	What is the aircraft’s L=D in this corner velocity turn?
(e) 	Does this aircraft have sufficient thrust to sustain this turn at corner
velocity? (Assume at small) What T=W ratio is required to sustain
this turn?
144 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 160 of 650 --

4
Aircraft Equations of Motion
To understand how an aircraft behaves, it is essential to develop and under-
stand the aircraft equations of motion (EOM). The EOM consist of the right-
hand side of the equations made up of the applied forces and moments, and
the left-hand side of the equations providing the aircraft response. The aircraft
equations of motion are obtained by applying Newton’s 2nd law to a rigid
aircraft. Newton’s 2nd law states that the summation of the applied forces
acting on the aircraft is equal to the time rate of change of linear momentum,
and that the summation of the applied moments acting on the aircraft is equal
to the time rate of change of angular momentum. To develop these equations
of motion, it is necessary to understand the various axis systems. The follow-
ing section discusses the axis systems used in our development of the EOM.
4.1 	Aircraft Axis Systems
In this chapter we will concern ourselves with three axis systems. These
include the body axis system fixed to the aircraft, the Earth axis system, which
we will assume to be an inertial axis system fixed to the Earth, and the stabi-
lity axis system, which is defined with respect to the relative wind. Each of
these systems is useful in that they provide a convenient system for defining a
particular vector, such as, the aerodynamic forces, the weight vector, or the
thrust vector.
4.1.1 	Body Axis System
The body axis system is fixed to the aircraft with its origin at the aircraft’s
center of gravity. The x axis is defined out the nose of the aircraft along some
reference line. The reference line may be chosen to be the chord line of the
aircraft or may be along the floor of the aircraft, as is often the case in large
transports. The y axis is defined out the right wing of the aircraft, and the z
axis is defined as down through the bottom of the aircraft in accordance with
the right-hand rule, as shown in Fig. 4.1. The pilot sits in the body axis
system, making it a very useful reference frame. Additionally, it is relatively
easy to determine the moments and products of inertia in the body axis system
because it is fixed to the aircraft.
4.1.2 	Earth Axis System
The Earth axis system is fixed to the Earth with its z axis pointing to the
center of the Earth. The x axis and y axis are orthogonal and lie in the local
horizontal plane with the origin at the aircraft center of gravity. Often, the x
145

-- 161 of 650 --

axis is defined as North and the y axis defined as East. The Earth axis system
is assumed to be an inertial axis system for aircraft problems. This is important
because Newton’s 2nd law is valid only in an inertial system. While this
assumption is not totally accurate, it works well for aircraft problems where the
aircraft rotation rates are large compared to the rotation rate of the Earth.
4.1.3 	Stability Axis System
The stability axis system is rotated relative to the body axis system through
the angle of attack. This means that the stability x axis points in the direction
of the projection of the relative wind onto the xz plane of the aircraft. The
origin of the stability axis system is also at the aircraft center of gravity. The y
axis is out the right wing and coincident with the y axis of the body axis
system. The z axis is orthogonal and points downward in accordance with the
right-hand rule. This is illustrated in Fig. 4.2. The stability axis system is parti-
cularly useful in defining the aerodynamic forces of lift and drag.
Fig. 4.1 	Body axis system.
Fig. 4.2 	Stability axis system.
146 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 162 of 650 --

4.2 	Coordinate Transformations
As stated previously, it is convenient to express certain vectors in a particu-
lar coordinate system. For example, the weight vector of the aircraft is conveni-
ently represented in the Earth axis system where there is only a component in
the positive z direction because the vector acts toward the center of the Earth,
that is,
FFWeight Earth ¼ FFGravity Earth ¼ FFG E ¼
0
0
W
2
4
3
5
Earth
¼
0
0
mg
2
4
3
5
Earth
ð4:1Þ
The aerodynamic forces are conveniently displayed in the stability axis, where
drag acts in the negative x direction and lift acts in the negative z axis, that is,
FFAero ¼ FFA ¼
D
FAy
L
2
4
3
5
Stability
ð4:2Þ
Likewise, the thrust vector can easily be expressed in the body axis as
FFThrust ¼ FFT ¼
T cosðfT Þ
0
T sinðfT Þ
2
4
3
5
Body
ð4:3Þ
where fT is the angle between the x-body axis and the thrust vector, T. While
these equations are conveniently displayed in a particular axis system, they
must be all transformed into the same axis system before they can be summed
in the equations of motion. As a result, it is very important to understand how
to transform a vector from one axis system to another.
4.2.1 	Earth Axis to Body Axis Transformation
Transforming a vector from the Earth axis system to the body axis system
requires three consecutive rotations about the z axis, y axis, and x axis, respec-
tively. In flight mechanics, the Euler angles are used to rotate the ‘‘vehicle
carried’’ Earth axis system into coincidence with the body axis system. The
Euler angles are expressed as yaw (C), pitch (Y), and roll (F). Euler angles
are very useful in describing the orientation of the aircraft with respect to iner-
tial space. The proper order or rotation is illustrated in Fig. 4.3.
The yaw angle, C, is defined as the angle between the projection of the x-
body axis onto the horizontal plane and the x axis of the Earth axis system.
With the Earth x axis defined as North, the yaw angle is the same as the vehi-
cle heading angle. The pitch angle, Y, is the angle measured in a vertical
plane between the x-body axis and the horizontal plane. The roll angle, F, is
the angle measured in the yz plane of the vehicle body axis system, between
the y-body axis and the horizontal plane. This is the same as the bank angle
AIRCRAFT EQUATIONS OF MOTION 	147

-- 163 of 650 --

for a given c and y, and is a measure of the rotation about the x axis to put
the aircraft in the desired position from a wing’s horizontal condition. The
accepted limits on the Euler angles are
0  C  360 deg
90 deg  Y  90 deg
180 deg  F  180 deg
The importance of the sequence of the Euler angle rotations cannot be overem-
phasized. If the sequence is performed in a different order than c, y, and f,
the final result will be incorrect. The following illustrates the transformation of
a vector, FFE , in the Earth axis system into the body axis system, where
FFE ¼ XE^iiE þ YE ^jj E þ ZE ^kk E 	ð4:4Þ
and ^iiE, ^jjE , and ^kk E are the unit vectors in the Earth axis system. Therefore,
FFE ¼
X E
YE
ZE
2
4
3
5
Earth
ð4:5Þ
If we rotate through the yaw angle, c, about the z-Earth axis, ^kkE , we end up in
some intermediate axis system ^ii0, ^jj0, and ^kk0. (See Fig. 4.4.)
The vector in the intermediate axis system (^ii0, ^jj0, and ^kk0) is:
FF0 ¼ X 0^ii0 þ Y 0^jj0 þ Z0 ^kk0 	ð4:6Þ
where
X 0 ¼ XE cos C þ YE sin C
Y 0 ¼ X E sin C þ YE cos C
Z0 ¼ ZE
ð4:7Þ
Fig. 4.3 	Earth to body transformation.
148 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 164 of 650 --

so
X 0
Y 0
Z0
2
4
3
5 ¼
cos C 	sin C 	0
 sin C 	cos C 	0
0 	0 	1
2
4
3
5
|fflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl}
R3ðCÞ
XE
YE
ZE
2
4
3
5 	ð4:8Þ
FF0 ¼ R3ðCÞ FF E 	ð4:9Þ
We will now rotate this intermediate vector, FF0, through some pitch angle, Y,
to some other intermediate axis system, ^ii00, ^jj00, and ^kk00 as shown in Fig. 4.5.
Fig. 4.4 	Rotation through C.
Fig. 4.5 	Rotation through Y.
AIRCRAFT EQUATIONS OF MOTION 	149

-- 165 of 650 --

The vector in the intermediate axis is
FF00 ¼ X 00i00 þ Y 00j00 þ Z00k00 	ð4:10Þ
where
X 00 ¼ X 0 cos Y  Z0 sin Y
Y 00 ¼ Y 0
Z00 ¼ X 0 sin Y þ Z0 cos Y
ð4:11Þ
X 00
Y 00
Z00
2
4
3
5 ¼
cos Y 	0 	 sin Y
0 	1 	0
sin Y 	0 	cos Y
2
4
3
5
|fflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl}
R2ðYÞ
X 0
Y 0
Z0
2
4
3
5 	ð4:12Þ
so,
FF00 ¼ R2ðYÞ FF0 ¼ R2ðYÞR3ðCÞ FFe 	ð4:13Þ
Finally we will rotate the vector, FF00, through some roll angle, F, into the body
axis system, ^ii, ^jj, and ^kk as shown in Fig. 4.6.
Fig. 4.6 	Rotation through F.
150 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 166 of 650 --

The vector in the body axis system is
FF B ¼ X B^ii þ YB ^jj þ Z B ^kk 	ð4:14Þ
where
X B ¼ X 00 	ð^ii directionÞ
YB ¼ Y 00 cos F þ Z00 sin F 	ð ^jj directionÞ
Z B ¼ Y 00 sin F þ Z00 cos F 	ð^kk directionÞ
ð4:15Þ
XB
Y B
Z B
2
4
3
5 ¼
1 	0 	0
0 	cos F 	sin F
0 	 sin F 	cos F
2
4
3
5
|fflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl}
R1ðFÞ
X 00
Y 00
Z00
2
4
3
5 	ð4:16Þ
so,
FF B ¼ R1ðFÞ FF00 ¼ R1ðFÞR2ðYÞR3ðCÞ FFE 	ð4:17Þ
Therefore, any vector in the Earth axis system can be transformed into the
body axis system using the following transformation.
FF B ¼ R1ðFÞR2ðYÞR3ðCÞ FFE 	ð4:18Þ
This transformation is very useful in transforming the weight vector of an
aircraft expressed in the Earth axis into the body axis system. As shown earlier
in Eq. (4.1), the aircraft’s weight vector in the Earth axis system is
FFGravity Earth ¼ FFG E ¼
0
0
W
2
4
3
5
Earth
¼
0
0
mg
2
4
3
5
Earth
ð4:19Þ
The vector in the body axis system is easily found using the transformation
from Eq. (4.18) as shown in Eq. (4.20).
FFGravityB ¼
1 	0 	0
0 	cos F 	sin F
0 	 sin F 	cos F
2
6
4
3
7
5
cos Y 	0 	 sin Y
0 	1 	0
sin Y 	0 	cos Y
2
6
4
3
7
5
cos C 	sin C 	0
 sin C 	cos C 	0
0 	0 	1
2
6
4
3
7
5
0
0
mg
2
6
4
3
7
5
E
ð4:20Þ
AIRCRAFT EQUATIONS OF MOTION 	151

-- 167 of 650 --

This yields the following weight vector in the body axis system:
FFGravityB ¼
mg sin Y
mg sin F cos Y
mg cos F cos Y
2
4
3
5
B
ð4:21Þ
In going from the body axis system to the Earth axis system, we go through
F, then Y, and then C. So the transformation is
FFE ¼ R3ðCÞR2ðYÞR1ðFÞ FF B 	ð4:22Þ
For these orthonormal transformation matrices
R1ðFÞ ¼ RT
1 ðFÞ
R2ðYÞ ¼ RT
2 ðYÞ
R3ðCÞ ¼ RT
3 ðCÞ
ð4:23Þ
where the superscript T indicates the transposition of the matrix.
Therefore,
FFE ¼ R T
3 ðCÞR T
2 ðYÞRT
1 ðFÞ FF B 	ð4:24Þ
This is convenient for transforming the acceleration or velocity vector in the
body axis system into a vector in the Earth axis system, as might be measured
by a radar site tracking the aircraft.
4.2.2 	Stability Axis to Body Axis Transformation
It is also important to transform a vector in the stability axis system into the
body axis system. This is useful in transforming the aerodynamic forces from
their convenient axis system, Eq. (4.7), into the body axis system. This is
accomplished by rotating the stability axis system through a positive angle of
attack, as shown in Fig. 4.7.
Fig. 4.7 	Stability to body axis transformation.
152 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 168 of 650 --

The transformation from stability to body is simply a rotation about the y
axis through the angle a, or an R2ðaÞ transformation, namely,
FFAero Body ¼ R2ðaÞ FFAero Stability 	ð4:25Þ
FA x
FA y
F Az
2
4
3
5
Body
¼
cos a 	0 	 sin a
0 	1 	0
sin a 	0 	cos a
2
4
3
5
|fflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl}
R2ðaÞ
D
FA y
L
2
4
3
5
Stability
ð4:26Þ
Therefore,
FA XB
¼ D cos a þ L sin a
F AyB
¼ FA yS
FA zB
¼ D sin a  L cos a
ð4:27Þ
4.2.3 	Summary of Axes Transformation
Figure 4.8 provides a block diagram showing the complete set of transfor-
mations from the Earth axis system to the stability axis system. As already
stated, the arrow shows a positive transformation from one axis system to
another.
4.3 	Aircraft Force Equations
This section develops the three aircraft force equations. The force equations
consist of aircraft response (in terms of accelerations) on the left-hand side of
the equations, and the applied forces on the right-hand side of the equations.
Newton’s 2nd law states that the time rate of change of linear momentum is
equal to the summation of the applied forces acting on the aircraft’s center of
gravity:
dðm VV Þ
dt
 	
Inertial
¼ FF 	ð4:28Þ
It is extremely important to understand that Newton’s 2nd law is only valid in
an inertial reference frame. An inertial reference frame is an axis system that is
Fig. 4.8 	Earth axis system to stability axis system transformation.
AIRCRAFT EQUATIONS OF MOTION 	153

-- 169 of 650 --

fixed in space with no relative motion. For the purposes of analyzing aircraft,
it will be assumed that the Earth axis system is an inertial reference frame,
even though it does have rotation. It is assumed that the rotation rate of the
Earth is small compared to the rotation rates of the aircraft.
4.3.1 	Aircraft Response
In developing the response side of the aircraft force equations, several addi-
tional assumptions will be made. First, it is assumed that the aircraft is a rigid
body. This assumes that the different parts of the aircraft are not moving with
respect to each other. The mass of the aircraft is also assumed to be constant,
which is reasonable over a relatively short duration of time. This assumption
allows Newton’s 2nd law to be rewritten as
m dð VV Þ
dt
 	
Inertial
¼ maaInertial ¼ FF 	ð4:29Þ
While Newton’s 2nd law is only valid with respect to an inertial reference
frame, the equations can be expressed in the vehicle body axis system. If the
equations are expressed in the body axis system, the fact that the system is
rotating with respect to an inertial reference frame must be taken into account.
This is accomplished using
ðaaInertialÞBody ¼ _VVVV Body þ o	oBody  VVBody 	ð4:30Þ
The velocity vector in the body axis system, VVBody , is defined as
VVBody ¼ U^ii þ V ^jj þ W ^kk 	ð4:31Þ
where U, V , and W are the velocities in the x, y, and z body axes, respectively.
The aircraft angular rate in the body axis system, o	oBody , is defined as
o	oBody ¼ P^ii þ Q^jj þ R^kk 	ð4:32Þ
where P, Q, and R are the roll, pitch, and yaw rates, respectively, expressed in
the body axis. Therefore,
ðaaInertialÞBody ¼
_U	U
_VV
_W	W
2
4
3
5
Body
þ
^ii 	^jj 	^kk
P 	Q 	R
U 	V 	W Body
ð4:33Þ
This results in
ðaaInertialÞBody ¼
_U	U þ QW  RV
_VV þ RU  PW
_W	W þ PV  QU
2
4
3
5
Body
ð4:34Þ
154 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 170 of 650 --

Multiplying the inertial acceleration in the body axis system by the mass of the
aircraft yields the three force equations
m
_U	U þ QW  RV
_VV þ RU  PW
_W	W þ PV  QU
2
4
3
5
Body
¼
F x
F y
F z
2
4
3
5
Body
¼ FFBody 	ð4:35Þ
Therefore,
mð _U	U þ QW  RV Þ ¼ Fx
mð _VV þ RU  PW Þ ¼ Fy
mð _W	W þ PV  QU Þ ¼ Fz
ð4:36Þ
4.3.2 	Applied Forces
The previous section developed the left-hand side, or response side, of the
force equations. The right-hand side of each equation consists of the applied
forces that act on the aircraft. They consist of the gravity forces, the aerody-
namic forces, and the thrust forces.
mð _U	U þ QW  RV Þ ¼ F Gx þ FA x þ FT x
mð _VV þ RU  PW Þ ¼ F Gy þ FA y þ FT y
mð _W	W þ PV  QU Þ ¼ F Gz þ FAz þ FT z
ð4:37Þ
Because the left-hand sides of the equations were developed in the body axis
system, the right-hand side must also be in the body axis system. Therefore,
each of the forces must be represented in the body axis system for the previous
equations to be valid. The gravity forces, aerodynamic forces, and thrust forces
were previously determined in the body axis system in Secs. 4.2.2, 4.3.2, and
4.2, respectively. Therefore, the three force equations in the body axis system
are
mð _U	U þ QW  RV Þ ¼ mg sin Y þ ðD cos A þ L sin AÞ þ T cos FT
mð _VV þ RU  PW Þ ¼ mg sin F cos Y þ FAy þ F T y
mð _W	W þ PV  QU Þ ¼ mg cos F cos Y þ ðD sin A  L cos AÞ  T sin FT
ð4:38Þ
4.4 	Moment Equations
The three moment equations are determined by applying Newton’s 2nd law
in a manner similar to the three force equations. Newton’s 2nd law states that
AIRCRAFT EQUATIONS OF MOTION 	155

-- 171 of 650 --

the time rate of change in the angular momentum of the aircraft is equal to the
applied moments acting on the aircraft, namely,
d H	H
dt
 	
Inertial
¼ M	M 	ð4:39Þ
H	H is the angular momentum of the aircraft and is defined as
H	H ¼ rr  ðm VV Þ 	ð4:40Þ
Equation (4.39) will be used, along with some simplifying assumptions, to
develop the three rotational equations of motion.
4.4.1 	Response Side of Moment Equations
A six-step procedure will be used to methodically build up the response
side of the three moment equations. This provides both a mathematical and
physical insight into the equations.
4.4.1.1 	Step 1. 	The first step is to examine a small elemental mass, dm, of
the aircraft that is located at some distance from the aircraft’s center of gravity. It
will be assumed that the elemental mass is rotating about the aircraft center of
gravity with a positive roll rate, pitch rate, and yaw rate (P, Q, and R,
respectively). The distance from the center of gravity to the small mass is defined
as
rrdm ¼ x^ii þ y^jj þ z^kk 	ð4:41Þ
where x, y, and z are the distances in the x, y, and z axes of the body axis
system, respectively. This is shown in Fig. 4.9.
Fig. 4.9 	Differential mass in body axis system.
156 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 172 of 650 --

4.4.1.2 	Step 2. 	Next an expression is developed for the velocity of the
small mass, dm, solely because of its rotation about the center of gravity. The
velocity for the movement of the center of gravity of the aircraft was taken into
account in the development of the three force equations. The velocity, VVdm, of the
mass relative to the center of gravity is determined using the expression
VVdm ¼ drrdm
dt
 	
Body
þ o	oBody  rrdm 	ð4:42Þ
Because the aircraft was previously assumed to be a rigid body, rrdm is constant,
so
drrdm
dt
 	
Body
¼ 0 	ð4:43Þ
and therefore,
VVdm ¼ o	oBody  rrdm 	ð4:44Þ
Mathematically this yields
VVdm ¼
^ii 	^jj 	^kk
P 	Q 	R
x 	y 	z
ð4:45Þ
VVdm ¼ ðQz  RyÞ^ii þ ðRx  PzÞ ^jj þ ðPy  QxÞ^kk 	ð4:46Þ
4.4.1.3 	Step 3. 	Next an expression is developed for the linear momentum
of dm solely because of its rotation about the center of gravity. The linear
momentum is found simply by multiplying the mass times the velocity, namely,
linear momentum ¼ dm VV
¼ dm½ðQz  RyÞ^ii þ ðRx  PzÞ ^jj þ ðPy  QxÞ^kk ð4:47Þ
4.4.1.4 	Step 4. 	An expression for the angular momentum of the differ-
ential mass, dm, is developed using
d H	Hdm ¼ rrdm  ðdm VVdmÞ 	ð4:48Þ
Therefore,
d H	Hdm ¼
^ii 	^jj 	^kk
x 	y 	z
dmðQz  RyÞ 	dmðRx  PzÞ 	dmðPy  QxÞ
ð4:49Þ
AIRCRAFT EQUATIONS OF MOTION 	157

-- 173 of 650 --

After carrying out the cross product and regrouping the terms, the three
components of the angular momentum are:
dHx ¼ Pðy2 þ z2Þdm  Qxy dm  Rxz dm
dHy ¼ Qðx2 þ z2Þdm  Ryz dm  Pxy dm
dH z ¼ Rðx2 þ y2Þdm  Pxz dm  Qyz dm
ð4:50Þ
4.4.1.5 	Step 5. 	The next step is to integrate the expressions for the
angular momentum of dm over the entire aircraft. Because P, Q, and R are not
functions of the mass, they can be taken outside of the integration. Therefore, the
three components for the angular momentum of the entire aircraft are
Hx ¼
ð
dH x ¼ P
ð
ðy2 þ z2Þdm  Q
ð
xy dm  R
ð
xz dm
Hy ¼
ð
dH y ¼ Q
ð
ðx2 þ z2Þdm  R
ð
yz dm  P
ð
xy dm
H z ¼
ð
dH z ¼ R
ð
ðx2 þ y2Þdm  P
ð
xz dm  Q
ð
yz dm
ð4:51Þ
The moments of inertia are defined as
Ixx ¼
ð
ðy2 þ z2Þdm
I yy ¼
ð
ðx2 þ z2Þdm
I zz ¼
ð
ðx2 þ y2Þdm
ð4:52Þ
The moments of inertia are indications of the resistance to rotation about that
axis (that is, I xx indicates the resistance to rotation about the x axis of the
aircraft). The products of inertia are
I xy ¼
ð
xy dm
I xz ¼
ð
xz dm
I yz ¼
ð
yz dm
ð4:53Þ
The products of inertia are an indication of the symmetry of the aircraft.
Substituting the moments and products of inertia into Eq. (4.51) yields
H x ¼ PI xx  QI xy  RI xz
H y ¼ QI yy  RI yz  PI xy
H z ¼ RI zz  PI xz  QI yz
ð4:54Þ
158 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 174 of 650 --

where
H	H ¼ Hx^ii þ H y ^jj þ H z ^kk 	ð4:55Þ
This can also be easily found by applying an expression for angular momen-
tum usually developed in basic physics courses, which is
H	H ¼ II o	o 	ð4:56Þ
where II is the aircraft’s inertia tensor and o	o is the aircraft’s angular rate. The
inertia tensor for an aircraft is
II ¼
Ixx 	I xy 	I xz
I xy 	Iyy 	I yz
I xz 	Iyz 	I zz
2
4
3
5
Body
ð4:57Þ
Therefore,
HB ¼
I xx 	Ixy 	I xz
Ixy 	I yy 	I yz
I xz 	I yz 	I zz
2
4
3
5 P
Q
R
2
4
3
5 	ð4:58Þ
so,
H x ¼ PI xx  QI xy  RI xz
H y ¼ QI yy  RI yz  PI xy
H z ¼ RI zz  PI xz  QI yz
ð4:59Þ
Note this is the exact same result as Eq. (4.54) that resulted from applying
Steps 1–5.
If the aircraft is assumed to have an xz plane of symmetry, the I xy and I yz
products of inertia are zero. An aircraft has an xz plane of symmetry when the
left side of the aircraft is a mirror image of the right side about the xz plane.
The I xz is not necessarily zero because the aircraft is not symmetrical from top
to bottom about the xy plane and not symmetrical from front to rear about the
yz plane. These concepts are illustrated in Fig. 4.10. Notice for I xy and I yz the
reflection plane symmetry between quadrants I and IV, and II and III. This
leads to a zero value for both these products of inertia. Also notice that we do
not have reflection plane symmetry for the case of I xz; therefore, it has a non-
zero value.
AIRCRAFT EQUATIONS OF MOTION 	159

-- 175 of 650 --

The angular momentum components for the aircraft become
Hx ¼ PI xx  RI xz
Hy ¼ QI yy
H z ¼ RI zz  PI xz
ð4:60Þ
or
H	H ¼ ðPI xx  RI xzÞ^ii þ ðQI yyÞ^jj þ ðRI zz  PI xzÞ^kk 	ð4:61Þ
4.4.1.6 	Step 6. 	After the angular momentum vector of the aircraft has
been determined, the final step is to take the time rate of change of the angular
momentum vector with respect to inertial space but represented in the aircraft
body axis system. The same relationship used in developing the acceleration with
respect to an inertial reference frame from the force equations can be used,
namely,
d H	H
dt
 	
Inertial
¼ d H	H
dt
 	
Body
þ oBody  H	HBody 	ð4:62Þ
d H	H
dt
 	
Body
¼
_PPIxx  _RRI xz þ P_II xx  R_II xz
_Q	QI yy þ Q_II yy
_RRI zz  _PPI xz þ R_IIzz  P_II xz
2
6
4
3
7
5
Body
ð4:63Þ
Fig. 4.10 	Aircraft products of inertia.
160 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 176 of 650 --

Assuming that the mass distribution of the aircraft is constant, such as neglect-
ing fuel slosh, the moments and products of inertia do not change with time,
that is, _II xx, _II yy, _II zz, and _II xz are all zero. Therefore,
d H	H
dt
 	
Body
¼
_PPI xx  _RRI xz
_Q	QI yy
_RRI zz  _PPIxz
2
6
4
3
7
5
Body
ð4:64Þ
Finally,
o  H	HBody ¼
i 	j 	k
P 	Q 	R
ðPI xx  RI xzÞ 	ðQI yyÞ 	ðRI zz  PI xzÞ Body
ð4:65Þ
¼
QðRIzz  PI xzÞ  RQI yy
RðPI xx  RI xzÞ  PðRI zz  PI xzÞ
PQI yy  QðPI xx  RI xzÞ
2
6
4
3
7
5
Body
ð4:66Þ
Grouping terms yields
d H	H
dt
 	
Inertial Body
¼
_PPI xx þ QRðI zz  I yyÞ  ð _RR þ PQÞI xz
_Q	QI yy  PRðI zz  I xxÞ þ ðP2  R2ÞI xz
_RRI zz þ PQðI yy  I xxÞ þ ðQR  _PPÞI xz
2
6
4
3
7
5
Body
ð4:67Þ
Therefore, Eq. (4.68) yields the three moment equations of motion in the body
axis system, where the left-hand side represents the response of the aircraft and
the right-hand side consists of the applied moments.
_PPI xx þ QRðI zz  I yyÞ  ð _RR þ PQÞI xz ¼ L
_Q	QI yy  PRðI zz  IxxÞ þ ðP2  R2ÞI xz ¼ M
_RRI zz	|{z}
angular
acceleration
terms
þ PQðI yy  I xxÞ
|fflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflffl}
gyro
precession
terms
þ ðQR  _PPÞI xz	|fflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflffl}
coupling terms
¼ N 	ð4:68Þ
L, M , and N are the rolling moment, pitching moment, and yawing moment,
respectively. Unfortunately, the letter L is used to also represent lift. This can
be confusing and the reader is advised to carefully check the context of its use
in any aeronautical engineering text. Recall that the assumptions made in
developing the equations of motion were: the mass of the aircraft is constant,
the aircraft is a rigid airframe, the Earth axis system is an inertial reference
frame, the mass distribution of the aircraft is constant, and the aircraft has an
xz plane of symmetry. It is, therefore, extremely important to realize that these
AIRCRAFT EQUATIONS OF MOTION 	161

-- 177 of 650 --

equations are valid for flight conditions where these assumptions are reason-
able.
The aircraft response side of Eq. (4.68) can be divided into three types of
terms: angular acceleration, gyro precession, and coupling. The angular accel-
eration terms are the easiest to understand. For example, if we take the rolling
moment EOM and assume the gyro precession and coupling terms are negligi-
ble, we have
_PPI xx ¼ L
If a rolling moment (L) is applied to the aircraft (such as with an aileron
deflection), this equation predicts that an angular acceleration in roll ( _PP) will
result. If a positive rolling moment is applied, a positive roll angular accelera-
tion will result. For a given applied rolling moment, the larger the moment of
inertia, I xx, the smaller the roll angular acceleration. The angular acceleration
terms can be thought of as describing the motion that results from the applica-
tion of torque (the applied moment) to a rotating body with a moment of iner-
tia. For example, if we apply a torque to a flywheel, it experiences an angular
acceleration as it spins up.
The gyroscopic precession terms describe precession of the aircraft because
of the combination of angular momentum about an axis and an applied
moment. For example, consider the rolling moment EOM for the case of a roll-
ing pull-up. We will, for the moment, assume the angular acceleration and
coupling terms are negligible along with I zz. This leaves us with
I yy QR ¼ L
We next identify the angular momentum term for an aircraft in a pull-up (with
positive pitch rate Q) as I yy Q. Notice that I yy is the moment of inertia (always
positive) about the y axis and Q is the angular velocity about the y axis (posi-
tive for a pull-up). Multiplied together, we have angular momentum. We will
rewrite this as
R ðI yy QÞ
|fflffl{zfflffl}
angular momentum in pitch
¼ L
If the pilot now applies a positive rolling moment to the aircraft by deflecting
the ailerons, this equation predicts that a negative yawing moment (R) must
result. The precession terms describe the same type of precession that is
experienced by a gyroscope when a torque is applied. We will look at a second
example of a gyro precession term for the case of tail dragger propeller
aircraft. Consider the pitching moment EOM. We will assume the angular
acceleration and coupling terms are negligible along with I zz.
R ðI xx PÞ
|fflffl{zfflffl}
angular momentum in roll
¼ M
162 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 178 of 650 --

A propeller aircraft, such as a P-51, has a significant amount of angular
momentum in roll because of the rotation of the propeller. Because the propel-
ler usually rotates clockwise as seen from the cockpit, the roll angular momen-
tum is positive. With the aircraft on takeoff roll, the pilot will apply a small
nose down stick input (negative M ) to raise the tail. Our abbreviated equation
predicts that a negative yaw rate (R) must result. Skillful pilots are ready for
this precession and will apply right rudder to counteract the negative yaw rate.
The coupling terms describe inertial coupling tendency of the aircraft. They
can be easily identified by the Ixz product of inertia. A nonzero value of I xz
indicates inertial nonsymmetry of the aircraft. Many modern high-performance
aircraft have a negative I xz, which indicates a larger concentration of mass in
the two negative quadrants formed by xz plane of the aircraft. Consider the
pitching moment EOM with the gyro precession and applied pitching moment
terms assumed negligible and zero yaw rate (R).
P2I xz ¼ I yy _Q	Q
We will assume the aircraft is doing a high-speed fly-by and has a negative I xz.
If the pilot does a snap roll to either direction, this equation predicts that a
positive angular acceleration ( _Q	Q) will result. This will cause the aircraft to
pitch up and could lead to serious effects if the pilot does not anticipate the
pitch up. It can, of course, be counteracted with a nose down stick input. This
particular case is referred to as roll coupling, which resulted in the crash of
several aircraft in the 1940s and 1950s, before a full understanding of
coupling.
4.4.2 	Applied Moments
The applied moments consist of the aerodynamic rolling, pitching, and
yawing moments, L A, MA, and N A, respectively, and the rolling, pitching, and
yawing moments because of thrust, LT , MT , and N T, respectively. There are no
moments because of gravity because the weight vector acts through the center
of gravity and the moment arms are zero. Also, any moments because of rotat-
ing masses (such as jet engines) on or within the aircraft have been neglected.
Therefore,
_PPIxx þ QRðI zz  I yyÞ  ð _RR þ PQÞI xz ¼ LA þ LT
_Q	QI yy  PRðI zz  I xxÞ þ ðP2  R2ÞI xz ¼ M A þ M T
_RRI zz þ PQðI yy  I xxÞ þ ðQR  _PPÞI xz ¼ NA þ N T
ð4:69Þ
The makeup of each of these moments will be discussed in detail in subse-
quent chapters.
AIRCRAFT EQUATIONS OF MOTION 	163

-- 179 of 650 --

4.5 	Longitudinal and Lateral-Directional Equations of Motion
The six aircraft equations of motion (EOM) can be decoupled into two sets
of three equations. These are the three longitudinal EOM and the three lateral-
directional EOM. This is convenient in that it requires only three equations to
be solved simultaneously for many flight conditions. For example, an aircraft
in wings-level flight with no sideslip and a pitching motion can be analyzed
using only the longitudinal EOM because the aircraft does not have any
lateral-directional motion.
4.5.1 	Longitudinal Equations of Motion
The three longitudinal EOM consist of the x force, z force, and y moment
equations, namely,
mð _U	U þ QW  RV Þ ¼ mg sin Y þ ðD cos a þ L sin aÞ þ T cos FT
_Q	QI yy  PRðIzz  I xxÞ þ ðP2  R2ÞI xz ¼ M A þ M T
mð _W	W þ PV  QU Þ ¼ mg cos F cos Y þ ðD sin a  L cos aÞ  T sin FT
ð4:70Þ
One way of thinking of the longitudinal EOM is to picture an aircraft with its
xz plane coincident with an xz plane fixed in space. Longitudinal motion
consists of those movements where the aircraft would only move within that xz
plane, that is, translation in the x direction, translation in the z direction, and
rotation about the y axis. In each of these cases, the xz plane of the aircraft
would be moving within a xz plane fixed in space. It should be noted that the
L in Eq. (4.70) refers to lift and not rolling moment.
4.5.2 	Lateral-Directional Equations of Motion
The lateral-directional EOM consist of the y force, x moment, and z
moment equations, namely,
_PPI xx þ QRðI zz  I yyÞ  ð _RR þ PQÞI xz ¼ L A þ Lt
mð _VV þ RU  PW Þ ¼ mg sin F cos Y þ FA y þ FT y
_RRI zz þ PQðI yy  I xxÞ þ ðQR  _PPÞI xz ¼ N A þ NT
ð4:71Þ
For any lateral-directional motion the xz plane would move out of some xz
plane fixed in space. Translation in the y direction, roll about the x axis, and
yaw about the z axis would all cause the xz plane of the aircraft to move out of
that arbitrarily fixed xz plane in space.
4.6 	Kinematic Equations
In addition to the six force and moment EOM, additional equations are
required in order to completely solve the aircraft problem. These additional
equations are necessary because there are more than six unknowns due to the
presence of the Euler angles in the force equations. Three equations are
164 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 180 of 650 --

obtained by relating the three body axis system rates, P, Q, and R to the three
Euler rates, _C	C, _Y	Y, and _F	F. Note that the Euler rates are just the time rate of
change of the Euler angles.
To develop the relationship between the body rates and the Euler rates, the
following equality must be satisfied because the magnitude of the three body
rates must equal the magnitude of three Euler rates. Note that these are vector
equations.
o	oBody ¼ P^ii þ Q^jj þ R^kk ¼ _C	CC	C þ _Y	YY	Y þ _F	FF	F 	ð4:72Þ
In other words,
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
P2 þ Q2 þ R2
p ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
_C	C2 þ _Y	Y2 þ _F	F2
p
Each of the three Euler rates can be conveniently displayed in one of the axis
systems used in transforming a vector from the Earth axis system to the body
axis system. Because _C represents an angular rate about the Z E or Z0 axis
_C	CC	C ¼ _C	C^kk E ¼ _C	C^kk0 	ð4:73Þ
This Earth axis heading angular rate is illustrated in Fig. 4.11.
The earth axis system is first rotated about the Z E ðZ0 Þ axis through the
heading angle (C) into the X 0-Y 0-Z0 axis system as shown in Fig. 4.12. The
new X 0 axis lies directly beneath the x-body axis but is offset by the pitch
angle (Y).
This first interim coordinate system is then rotated about the Y 0 axis through
the pitch angle (Y) into the X 00-Y 00-Z00 axis system as shown in Fig. 4.13. Note
that because the Y 0 axis is the axis of rotation, the new Y 00 axis is the same as
Fig. 4.11 	Illustration of heading angular rate in Earth axis system.
AIRCRAFT EQUATIONS OF MOTION 	165

-- 181 of 650 --

Y 0. _Y then represents an angular rate about the Y 0 or Y 00 axis. Mathematically,
this can be summarized as
_Y	YY	Y ¼ _Y	Y^jj0 ¼ _Y	Y^jj00 	ð4:74Þ
This second interim coordinate system aligns the X 00 axis with the body x-axis
as shown in Fig. 4.14.
This second interim coordinate system is then rotated about the X 00 axis
through the roll angle (F) into the body axis system as shown in Fig. 4.15. _F
then represents an angular rate about the X 00 or X B axis. Mathematically, this
can be summarized as
_F	FF	F ¼ _F	F^ii00 ¼ _F	F^ii 	ð4:75Þ
Fig. 4.12 	X 0-Y 0-Z0 interim coordinate system.
Fig. 4.13 	Illustration of pitch attitude angular rate.
166 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 182 of 650 --

By using the transformations discussed in Sec. 4.2.1, each of these angular
rate vectors can be transformed into the body axis system. Therefore,
o	oBody ¼ P^ii þ Q ^jj þ R^kk ¼ R1ðFÞR2ðYÞ _C	CC	C þ R1ðFÞ _Y	YY	Y þ _F	FF	F 	ð4:76Þ
The previous relationship is true for the following reasons. To transform _C	CC	C
from the ^kk0 axis to the body axis system requires a positive rotation through
Y, followed by a positive rotation through F. To transform _Y from the ^jj00 axis
to the body axis system requires a positive rotation through F only. Finally, _F
is already represented in the body axis system, so no transformation is neces-
sary. Mathematically, Eq. (4.76) is carried out as shown in Eqs. (4.77–4.79).
P
Q
R
2
6
4
3
7
5 ¼
1 	0 	0
0 	cos F 	sin F
0 	 sin F 	cos F
2
6
4
3
7
5
cos Y 	0 	 sin Y
0 	1 	0
sin Y 	0 	cos Y
2
6
4
3
7
5
0
0
_C	C
2
6
4
3
7
5
þ
1 	0 	0
0 	cos F 	sin F
0 	 sin F 	cos F
2
6
4
3
7
5
0
_Y	Y
0
2
6
4
3
7
5 þ
_F	F
0
0
2
6
4
3
7
5 	ð4:77Þ
P
Q
R
2
6
4
3
7
5 ¼
1 	0 	0
0 	cos F 	sin F
0 	 sin F 	cos F
2
6
4
3
7
5
 sin Y _C	C
0
cos Y _C	C
2
6
4
3
7
5 þ
0
cos F _Y	Y
 sin F _Y	Y
2
6
4
3
7
5 þ
_F	F
0
0
2
6
4
3
7
5 ð4:78Þ
P
Q
R
2
6
4
3
7
5 ¼
 sin Y _C	C þ _F	F
sin F cos Y _C	C þ cos F _Y	Y
cos F cos Y _C	C  sin F _Y	Y
2
6
4
3
7
5 	ð4:79Þ
Fig. 4.14 	X0-Y 00-Z00 interim coordinate system.
AIRCRAFT EQUATIONS OF MOTION 	167

-- 183 of 650 --

Therefore, the three kinematic equations are
P ¼  sin Y _C	C þ _F	F
Q ¼ sin F cos Y _C	C þ cos F _Y	Y
R ¼ cos F cos Y _C	C  sin F _Y	Y
ð4:80Þ
Examples are provided to clearly illustrate results from the kinematic equa-
tions.
Example 4.1
An aircraft has the following Euler angles and Euler rates:
C ¼ 0 deg 	_C	C ¼ 10 deg=s
Y ¼ 0 deg 	_Y	Y ¼ 0 deg=s
F ¼ 90 deg 	_F	F ¼ 0 deg=s
Applying Eq. (4.80) yields:
P ¼ 0 deg=s
Q ¼ 10 deg=s
R ¼ 0 deg=s
Note that for this flight condition, a 10 deg=s Euler yaw rate, _C	C, is felt by
the pilot as a 10 deg=s pitch rate; Q:
Fig. 4.15 	Illustration of roll attitude angular rate.
168 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 184 of 650 --

Example 4.2
An aircraft has the following Euler angles and Euler rates:
C ¼ 0 deg 	_C	C ¼ 0 deg=s
Y ¼ 0 deg 	_Y	Y ¼ 20 deg=s
F ¼ 90 deg 	_F	F ¼ 0 deg=s
Applying Eq. (4.80) yields
P ¼ 0 deg=s
Q ¼ 0 deg=s
R ¼ 20 deg=s
Note that for this flight condition, a 20 deg=s Euler pitch rate, _Y	Y, is felt by
the pilot as a 20 deg=s yaw rate; R:
4.7 	Historical Snapshot—Genesis 2000 Flight Simulator
In the late 1980s, Veda, Incorporated, of Lexington Park, Maryland, and the
U.S. Air Force Academy Department of Aeronautics developed an engineering
flight simulator specifically tailored to support educational requirements. 1 The
simulator was named the Genesis 2000 and solved the full six degree-of-
freedom EOM Eqs. (4.38) and (4.69) in nearly real time to continuously repre-
sent almost any mission. The delay time between a pilot input and representation
of aircraft motion was less than 0.12 s based on available computer speed at that
Fig. 4.16 	Genesis 2000 flight station.
AIRCRAFT EQUATIONS OF MOTION 	169

-- 185 of 650 --

time. The fixed base flight station included an outside visual display complete
with heads-up display (HUD), a display for flight instruments, and standard
cockpit controls including a sidestick. Figure 4.16 shows the flight station.
A typical expansion of the applied force and moment side of each EOM
included the influences of angle of attack, sideslip, elevator deflection, aileron
deflection, rudder deflection, differential tail, speedbrakes, flaps, and spoilers
through the use of appropriate derivatives, as will be discussed in Chapter 5. A
key aspect of the Genesis 2000 was easy and quick access to each individual
derivative. This allowed flight evaluation of the derivative’s contribution to the
overall handling qualities (discussed in Chapter 7) of an aircraft. To do this,
another key feature of the Genesis 2000 was incorporation of specific mission
tasks such as approach and landing, air-to-ground tracking, and air-to-air track-
ing. The system was also used by the Air Force Test Pilot School, the U.S.
Naval Academy, and the British Empire Test Pilot School throughout the
1990s. At the Air Force Academy, the system was upgraded in 2000 to incor-
porate current computer technology.
Reference
1 Russell, J. H., Mouch, T. N., and Yechout, T. R., ‘‘Integration of Flight Simulation Into
the Undergraduate Design Experience,’’ AIAA TP 90-3263, AIAA=AHS=ASEE Aircraft
Design Systems and Operations Conference, Dayton, OH, Sept. 1990.
Problems
4.1 	Consider the T-37 at the following Euler angles:
C ¼ 90 deg 	Y ¼ þ10 deg 	F ¼ þ10 deg
Describe the aircraft attitude and transform the weight force through
these angles to the body axis system. The gross weight is 6600 lb f .
4.2 	A T-37 is executing a loop at the following conditions:
Euler angles: C ¼ 0 deg; Y ¼ 30 deg; F ¼ 0 deg
The pilot observes a pure pitch rate at a constant velocity in the body
axis system:
o	oB ¼
0
0:1
0
8
<
:
9
=
;B
rad=s 	VV B ¼
200
0
0
8
<
:
9
=
;B
ft=s
What is the acceleration in the Earth-fixed reference system?
170 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 186 of 650 --

4.3 	Given the following vectors, find the inertial acceleration in the body axis
system:
aa I ¼ _VVVV B þ o	o x VVB
_VVVV B ¼
10
0
0
8
>	<
>	:
9
>	=
>	;
ft
s 2 	o	o ¼
0
0
0:3
8
>	<
>	:
9
>	=
>	;
rad
s VV B ¼
300
0
0
8
>	<
>	:
9
>	=
>	;
ft
s
4.4 	Express all forces (namely, weight, aerodynamic, and thrust forces) for
sea-level standard day at military thrust on the T-37 in its most conveni-
ent axis system. Assume the thrust lines are parallel to the longitudinal
axis and in the plane of the CG. The aircraft weighs 5500 lbf and each
engine is delivering 700 lb f of thrust.
4.5 	How many degrees of freedom does an aircraft have? How many are
translational and how many are rotational?
4.6 	What forces and moments contribute to the pitching moment equation for
a conventional aircraft? Which ones do we generally ignore?
AIRCRAFT EQUATIONS OF MOTION 	171

-- 187 of 650 --

This page intentionally left blank

-- 188 of 650 --

5
Aircraft Static Stability
The static stability of an aircraft is generally the first type of stability that a
designer evaluates in a new aircraft configuration. Static stability criteria for
the three rotational modes of the aircraft (pitch, roll, and yaw) must be consid-
ered individually. Accepted design practice for most aircraft has been to
achieve some degree of static stability for each of these rotational degrees of
freedom. A tradeoff typically exists between static stability and maneuverabil-
ity. A high degree of static stability would normally result in an aircraft that
was easy to fly but that had low maneuverability (trainer aircraft, for example).
Fighter aircraft designs would incorporate low levels of static stability so that
enhanced maneuvering capabilities could be achieved. However, with the
advent of high authority fly-by-wire control systems in aircraft such as the F-
16, the Space Shuttle, and the X-29, acceptable levels of both static stability
and maneuverability can be achieved. Some degree of static instability in the
basic airframe design is intentionally incorporated in these aircraft to achieve
enhanced maneuvering capabilities, while the fly-by-wire system provides auto-
matic control inputs to achieve the appearance of static stability from the pilot
perspective. Static stability concepts provide a first step in achieving a design
with acceptable flying qualities.
5.1 	Static Stability Overview
Static stability is generally defined as the initial tendency of an airplane,
following a perturbation from a steady-state flight condition, to develop aero-
dynamic forces or moments that are in a direction to return the aircraft to the
steady-state flight condition. This somewhat complex definition can be simply
illustrated with an example. If each of the balls in Fig. 5.1 begin in steady-
173
Fig. 5.1 	Example of positive static stability, neutral static stability, and negative
static stability.

-- 189 of 650 --

state equilibrium or a trimmed condition (as illustrated by the dotted ball), then
the direction of the resulting force that develops after the ball is perturbed
from the trim condition determines the type of static stability the system has.
In the first case, the ball is perturbed from the bottom of the bowl, and the
resulting force tends to return it to the steady-state condition; thus, the situation
demonstrates positive static stability or simply static stability. In the second
case, when the ball is perturbed on a flat surface, no restoring force develops
and the situation demonstrates neutral static stability. The third case illustrates
negative static stability or static instability because when the ball is perturbed,
the resulting force tends to make the ball further diverge from the trimmed
position.
For an aircraft, static stability is generally evaluated relative to a steady-
state trimmed flight condition. If the aircraft is perturbed or displaced from the
trimmed flight condition with a gust, for example, then the initial aerodynamic
moment that results will determine the type of static stability that the aircraft
has. As illustrated in Fig. 5.2, if a gust produces a perturbation from the
trimmed angle of attack, and an aerodynamic moment results that would rotate
the aircraft back toward the trimmed condition, then we have positive static
stability. If no aerodynamic moment results, we have neutral static stability.
Finally, if an aerodynamic moment results that tends to increase the perturba-
tion, we have negative static stability or static instability. Because pitching or
longitudinal motion is depicted Fig. 5.2, we would refer to the aircraft as
having longitudinal static stability, neutral longitudinal static stability, or nega-
tive longitudinal static stability.
An arrow in flight is another example of static stability. An arrow with fins
on the back will always produce an aerodynamic restoring moment when
perturbed from its trimmed angle of attack (which is normally near zero). That
is why an arrow is very stable when flying through the air. However, removal
of the fins will result in a statically unstable situation where the arrow tumbles.
5.2 	Stability, Control Power, and Cross-Control Derivatives, and
Control Deflection Sign Convention
The first step in evaluating the static stability of an aircraft involves devel-
oping an expression for the applied aerodynamic forces and moments that act
Fig. 5.2 	Examples of an aircraft in perturbed flight.
174 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 190 of 650 --

on the aircraft. These were developed in general form in Secs. 4.3.2 and
4.4.2. To expand terms such as M A (the aerodynamic pitching moment) for
stability analysis, the stability axis is used along with a Taylor series expan-
sion. We know that M A can be expressed in terms of the pitching moment
coefficient as
M A ¼ C mðqqS ccÞ 	ð5:1Þ
and
LA ¼ Cl qqSb 	ð5:2Þ
NA ¼ Cn qqSb 	ð5:3Þ
Cm is then expressed with a first-order Taylor series as
C m ¼ Cm0 þ Cma a þ C mde
de þ Cm ih
i h 	ð5:4Þ
because Cm varies with a, de, and i h for steady-state trimmed analysis, a is of
course, angle of attack, de is the elevator deflection, and i h is the incidence
angle of the horizontal stabilizer (the angle between the horizontal stabilizer
chord line and the fuselage reference line or x-body axis, defined as positive
for leading edge up deflections). C m0 is the value of Cm when a, de, and ih are
equal to zero as illustrated in Fig. 5.3. Additional terms such as C m q q will be
added to this Taylor series when we consider dynamic stability but are not
needed now for our analysis of static stability.
In a similar manner,
Cl ¼ Cl0 þ Clb b þ Clda
da þ Cldr
dr 	ð5:5Þ
and
C n ¼ C n0 þ Cnb b þ Cnda
da þ Cndr
dr 	ð5:6Þ
Fig. 5.3 	Typical pitching moment coefficient vs angle of attack characteristics.
AIRCRAFT STATIC STABILITY 	175

-- 191 of 650 --

because C l and Cn are a function of b, da and dr. b is the sideslip angle (angle
between the relative wind and the x-body axis in the xy plane—see Fig. 5.26),
da is the aileron deflection, and dr is rudder deflection. C l0 and Cn0 are the
values of Cl and Cn respectively when b, da and dr are equal to zero. For
symmetrical aircraft, C l0 and C n0 are usually zero.
Cma , Clb , and C nb are referred to as stability derivatives. They represent the
change in the applicable moment coefficient with respect to the change in
direction of the relative wind (a for longitudinal motion, b for lateral and direc-
tional motion). We will see that the sign of each of these derivatives will deter-
mine the longitudinal, lateral, and directional static stability, respectively, of an
aircraft. For example, Fig. 5.3 presents a negative slope for Cm vs angle of
attack characteristics. This slope is the change in Cm divided by the change in
angle of attack, or simply the stability derivative C ma . With C ma negative,
notice that a gust that causes a perturbation in trim angle of attack to a slightly
lower value will result in a positive aerodynamic pitching moment, which gives
the aircraft an initial tendency back toward the trim condition. Likewise, a gust
that causes a perturbed increase in angle of attack will result in a negative
pitching moment, which also gives the aircraft an initial tendency back toward
the trim condition. Thus, a negative C ma can be seen as a requirement for longi-
tudinal static stability.
Cmde
, Cm ih
, Clda
, and C ndr
are referred to as primary control derivatives or
simply control powers. For example, C mde
is the longitudinal control power or
longitudinal control derivative that defines the change in C m that results from a
change in elevator deflection (de). The higher the absolute value of a control
derivative, the more moment is generated for a given control deflection. One
could think of this as higher control sensitivity for a given moment of inertia.
Primary control derivatives are defined using the following sign convention
to define a positive control surface deflection:
1) Positive elevator deflection (de) is trailing edge down (TED).
2) Positive incidence angle of the horizontal stabilizer (i h) is leading edge up
(LEU).
3) Positive aileron deflection is TED on either aileron, and a composite
aileron deflection (da) is defined as the difference between the left aileron
deflection and the right aileron deflection divided by two. A formula will
help clarify this definition:
da ¼ 1
2 ðdaleft  daright Þ
4) Positive rudder deflection (dr) is trailing edge left (TEL).
For example, a positive elevator deflection (de) will typically result in a nega-
tive (nose down) pitching moment, a positive i h will typically result in a nega-
tive pitching moment, a positive aileron deflection (da) will typically result in a
positive (right wing down) rolling moment, and a positive rudder deflection
(dr) will typically result in a negative (nose left) yawing moment. Deflections
176 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 192 of 650 --

in the opposite direction are negative. Most flight mechanics texts and aero-
space companies use this sign convention. A way to help remember this
convention is to realize that it conforms to the right-hand rule if applied to the
hinge line of each control surface. For example, if the right thumb is placed
along the elevator hinge line pointing in the direction of the positive y axis, the
fingers curl in the trailing edge down direction, which is defined as positive. A
similar argument holds for the aileron deflection. For the rudder, the right
thumb is pointed toward the direction of the positive z axis (out the bottom of
the aircraft) and the fingers curl in the trailing edge left direction. Using this
sign convention, the primary control derivatives have the following sign: C mde
is negative, C lda
is positive, and C ndr
is negative. Because the control surface
sign convention for a specific application external to this text may be defined
differently, the reader is cautioned to check the control deflection sign conven-
tion for consistency in any application.
C ldr
and C nda
are called cross-control derivatives because they define the
change in moment that results from the change in a control surface that is not
the primary control surface for that axis. For example, C ldr
defines the change
in rolling moment that results from a change in rudder deflection. With the
aileron being the primary control surface for the roll axis, C ldr
defines the roll-
ing moment that can be generated with a nonprimary control surface, the
rudder.
5.3 	Longitudinal Applied Forces and Moments
In Sec. 4.5, we separated aircraft motion into two independent cases, longi-
tudinal (pitch rotation, x- and z-axis translation), and lateral-directional (roll
and yaw rotation, y-axis translation). As discussed previously, conventional
aircraft configurations generally exhibit longitudinal motion, which is relatively
independent of lateral directional motion. This is not a perfect assumption,
especially for modern highly coupled aircraft, but it does allow us to analyze
each type of motion with three rather than six equations of motion (EOM).
Beginning with Eqs. (4.37) and (4.70) from Secs. 4.32 and 4.5, we now
expand the applied aero force and moment terms with conventional aerody-
namic coefficients for the case of longitudinal motion. In the stability axis,
F A x1s ¼ D 	ð5:7Þ
F Az1s ¼ L 	ð5:8Þ
M A1s ¼ MA 	ð5:9Þ
The added subscripting may seem confusing at first, but it simply indicates the
source (A for aero, T for thrust), the applicable axis (x, y, or z) for force direc-
tions, the ‘‘1’’ indicates a steady-state condition (as opposed to a condition that
varies with time), and the final subscript indicates the axis system for reference
(s for stability axis, b for body axis). For example, FAx1s
indicates an aero force
along the x stability axis, which is steady state. Moments eliminate the middle
subscript because the moment symbol designates the axis that the moment is
about. For example, M A1s
indicates an aero pitching moment that is steady state
AIRCRAFT STATIC STABILITY 	177

-- 193 of 650 --

and is defined about the y stability axis. L A1b
would indicate an aero rolling
moment that is steady state and defined about the x body axis. Fortunately, this
detail is only intended to reinforce the definition of each force or moment
contribution and will be quickly dropped to maintain simplicity.
The lift and drag forces could be translated to the body axis through a trans-
formation matrix to maintain compatibility with Eqs. (4.37) and (4.70) that
were developed in the body axis. If a small angle of attack is assumed, the
difference between body axis forces and stability axis forces in terms of lift
and drag would be small and the following approximations could be used:
FA x1b
ffi D 	ð5:10Þ
FA z1b
ffi L 	ð5:11Þ
However, from this point on we will develop the EOM in the stability axis,
primarily to keep the representation of lift and drag forces simplified. This
approach provides the advantage of simplifying the applied force side of the
EOM. Lift can be represented entirely along the z stability axis, and drag can
be represented entirely along the x stability axis. In essence, we will use a
body-fixed stability axis system for the steady-state, static-stability situations
evaluated. The body-fixed stability axis is best thought of as the stability axis
permanently fixed to the aircraft at a given trim or steady-state flight condition.
Additional discussion of this may be found in Sec. 6.2. To be perfectly correct,
the translational velocities U , V , and W, the angular velocities P, Q, and R,
and the appropriate moments and products of inertia, all found on the aircraft
response side of the six EOM, should now be defined relative to the body-
fixed stability axis system. This would keep both sides of the equations of
motion in the same axis system. However, if we assume the angle of attack is
small, little error is introduced by keeping the aircraft response side of the
EOM defined relative to the body axis. This provides the advantage of not
having to redefine the aircraft motion parameters (U, V , W , P, Q, and R) and
the moments and products of inertia every time a new trim condition (new
trim angle of attack) is analyzed. Use of the body-fixed stability axis system
also simplifies linearized representation of the applied aerodynamic forces and
moments, as we will discuss in Chapter 6.
5.3.1 	Aircraft Drag
As seen in Sec. 1.3.4.2, aircraft drag is expressed using the drag coefficient
as
D ¼ C D qqS 	ð5:12Þ
CD represents the total aircraft drag coefficient and is assumed to be a function
of the same parameters which affected Cm in Eq. (5.4), alpha, i h, and de, so
that a similar first-order Taylor series may be used to define CD.
C D ¼ C D0
 þ C Da a þ CD ih
i h þ CDde
de 	ð5:13Þ
178 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 194 of 650 --

CD0
 is defined as the value of CD when alpha, i h, and de are all zero. C Da is
the change in C D because of a change in alpha; CD ih
is the change in C D
because of a change in stabilizer incidence angle (defined at alpha and de
equal to zero); and C Dde
is the change in CD because of a change in de
(defined at alpha and i h equal to zero).
The drag coefficient is also a function of dynamic pressure (to account for
aeroelastic effects if the assumption of a rigid body is not valid), Mach
number, and Reynolds number. The previous expression for C D requires that
CD0
, C Da , CD ih
, and C Dde
are defined at appropriate Mach number and
Reynolds number conditions, and that aeroelastic effects are negligible. It also
assumes that CD0
 includes appropriate skin friction and pressure drag contri-
butions. The Taylor series of Eq. (5.13) provides a straightforward representa-
tion of CD suitable for 1) stability analysis (because alpha is our perturbed
longitudinal motion parameter); and 2) trimmed flight analysis (because i h
and de are the longitudinal control surfaces used to trim the aircraft). This
representation of C D is also compatible with the lift and pitching moment
expressions we will develop in the next sections. For most cases, C Dih
and
C Dde
may be neglected (assumed to have a value approximately equal to zero).
Exceptions to this simplification include minimum control speed problems and
problems where trim drag is important. With this assumption, Eq. (5.13)
becomes
CD ¼ CD0
 þ CDa a 	ð5:14Þ
It is important to realize the differences in this representation of CD and the
parabolic form of the drag polar discussed in Sec. 1.5.2. Recalling the para-
bolic drag polar
CD ¼ CD0 þ C2
L
peAR ð5:15Þ
and referring to Fig. 5.4 (a and CL can be thought of as interchangeable on the
vertical axis), we see that Eq. (5.14) represents a linearized approximation of
the parabolic drag polar at a tangent point defined by the steady-state angle of
attack and C D conditions being analyzed for stability. This is a good approxi-
mation if the perturbations from the steady-state trim condition are small, as is
typically the case in stability analysis.
As can be seen from Fig. 5.4, the value of C D0
 and CDa change with the
steady-state trim point being analyzed. It is also important to realize that C D0 ,
the parasite drag coefficient in the drag polar equation, and CD0
, the value of
CD with alpha, i h, and de equal to zero in the linearized drag approximation,
are not the same. The use of the asterisk () is intended to highlight this.
To estimate the two terms in Eq. (5.14), the drag polar Eq. (5.15) is needed.
This may be defined from analytical estimates, wind tunnel testing, or flight
test. C D0
 can then be defined from a plot such as Fig. 5.4, and C Da from
AIRCRAFT STATIC STABILITY 	179

-- 195 of 650 --

taking the derivative of the drag polar equation with respect to alpha (using the
assumption that C L ¼ CLa a).
CDa ¼ 2CL1
CLa
peAR ð5:16Þ
5.3.2 	Aircraft Lift
From Sec. 2.4.1, lift is expressed in terms of the lift coefficient as
L ¼ C L qqS 	ð5:17Þ
CL represents the total aircraft lift coefficient and will be assumed to be a func-
tion of the same parameters as CD and C M, namely alpha, ih, and de. The first-
order Taylor series expansion for C L becomes
CL ¼ C L0 þ C La a þ CL ih
ih þ CLde
de 	ð5:18Þ
CL0 is defined as the value of CL when alpha, i h, and de are all zero; C La is the
change in C L because of a change in alpha; C L ih
is the change in C L because
of a change in stabilizer incidence angle (defined at alpha and de equal to
zero); and C Lde
is the change in CL because of a change in de (defined at alpha
and ih equal to zero).
The lift coefficient is also a function of dynamic pressure (to account for
aeroelastic effects if the assumption of a rigid body is not valid), Mach
number, and Reynolds number. As with Eq. (5.13), Eq. (5.18) requires that
CL0 , CLa , C L ih
, and C Lde
are defined at appropriate Mach number and Reynolds
number conditions, and that aeroelastic effects are negligible.
Fig. 5.4 	Comparison of the drag polar and the linearized drag approximation.
180 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 196 of 650 --

To estimate CL0 and the derivative terms in Eq. (5.18) in terms of geometric
characteristics of an aircraft, we will use a conventional airplane (wing forward,
tail aft) as the example and lift predictions we have already developed. To
begin, we will consider the aircraft as being made up of two components: the
wing=fuselage and the horizontal tail.
The angle of attack acting on the lifting devices (wing and horizontal tail)
of each of these components must be defined. For many airplanes, the overall
aircraft angle of attack is defined as the angle between the relative wind and
the fuselage reference line (sometimes called the fuselage water line) or the x-
body axis. The angle of attack experienced by the wing is, in simple terms, the
aircraft angle of attack plus the wing incidence angle (as illustrated in Fig. 5.5)
aw ¼ a þ iw 	ð5:19Þ
To calculate the angle of attack at the horizontal tail (ah), the downwash
resulting from wingtip vortices must be considered. Downwash decreases the
effective incidence angle of the relative wind at the horizontal tail from that
experienced at the nose of the aircraft (see Fig. 5.6).
Fig. 5.5 	Geometry for calculating lift and pitching moment derivatives.
Fig. 5.6 	Velocity components at the horizontal tail.
AIRCRAFT STATIC STABILITY 	181

-- 197 of 650 --

The downwash effect is described with the angle epsilon, which is the aver-
age downwash angle induced by the wing on the tail. It is normally expressed
as
e ¼ e0 þ @e
@a a 	ð5:20Þ
Where e0 is the downwash angle at zero aircraft angle of attack. e0 and @e
@a are
normally estimated using an empirical formula or wind tunnel results.
To compute the angle of attack experienced by the horizontal tail (ah), we
must also take into account the horizontal tail incidence angle (ih) relative to
the fuselage reference line as shown in Fig. 5.5 and the effect of elevator
deflection (de). i h is defined as positive with a leading edge up deflection. ah
then becomes
ah ¼ a þ ih þ tede  e 	ð5:21Þ
te is called the elevator effectiveness. It is a ratio that relates a change in angle
of attack to a change in de. A physical understanding of te is presented in Fig.
5.7. With the orientation of the relative wind and the front portion of an airfoil
staying fixed, an elevator deflection, de, produces a change in the orientation of
the chord line which, in turn, changes the angle of attack of the airfoil. The
larger the chord of the elevator is relative to the overall chord of the airfoil, the
larger te will be.
The total lift acting on the aircraft in terms of the two components, wing
fuselage, and horizontal tail can then be expressed as
L ¼ L wf þ Lh cos e ffi L wf þ L h 	ð5:22Þ
In coefficient form, this becomes
C L qqS ¼ CL wf qqS þ C L h qq h S h 	ð5:23Þ
Fig. 5.7 	Geometric description of elevator effectiveness.
182 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 198 of 650 --

The dynamic pressure at the horizontal tail (qq h ¼ 1
2 rV 2
h ) may be different than
that acting on the wing-fuselage because of the boundary layer and engine
effects. The dynamic pressure ratio (Zh) is used to describe this difference.
Zh ¼ qq h
qq ð5:24Þ
Combining Eqs. (5.23) and (5.24) to solve for C L:
C L ¼ C L wf þ CL h Zh
S h
S ð5:25Þ
and expanding C L wf and C L h using a familiar Taylor series (and assuming
i w ¼ 0), we have
CL wf ¼ CL0wf
þ C Lawf
a 	ð5:26Þ
C L h ¼ CL0h
þ C Lah
ah 	ð5:27Þ
Substituting Eqs. (5.26) and (5.27) into Eq. (5.25), we have
CL ¼ C L0wf
þ CLawf
a
þ C Lah
Zh
S h
S a  	e0 þ de
da a
 	
þ i h þ tede
 	
þ Zh
S h
S C L0h
ð5:28Þ
This is a detailed expression for the lift coefficient for the overall aircraft and
is very useful because most of the parameters in it can be calculated or esti-
mated given the geometry of an aircraft configuration. We can now use Eq.
(5.28) to calculate the key parameters in Eq. (5.18). For C L0 , we set alpha, i h
and de equal to zero.
C L0 ¼ C L0wf
 CLah
Zh
S h
S e0 þ Zh
S h
S C L0h
 CL0wf
ð5:29Þ
The approximation in Eq. (5.29) can be made if e0 and C L0h
are small. In the
case of C L0h
, most aircraft use a symmetrical airfoil for the horizontal tail and,
for this case, C L0h
is zero.
To obtain CLa (the total aircraft lift-curve slope), we simply take the partial
derivative of Eq. (5.28) with respect to alpha.
C La ¼ CLawf
þ C Lah
Zh
S h
S 1  de
da
 	
ð5:30Þ
AIRCRAFT STATIC STABILITY 	183

-- 199 of 650 --

CL ih
and C Lde
are obtained through partial differentiation in a similar manner.
C L ih
¼ CLah
Zh
S h
S ð5:31Þ
C Lde
¼ CLah
Zh
S h
S te 	ð5:32Þ
In summary, we have developed a detailed method to approximate lift using a
first order Taylor series expansion. To once again put things in perspective,
remember that
FA z1s
¼ L ¼ C L qqS ¼ ðC L0 þ CLa a þ CL ih
i h þ C Lde
deÞqqS 	ð5:33Þ
Figure 5.8 presents wind tunnel data for the F-15B for four tail deflections. 1
An angle of attack range of zero to 90 deg was evaluated. Notice that the
maximum lift coefficient for each configuration occurs between 25 and 40 deg
angle of attack. Notice also that higher values of i h result in higher values
of C L.
Fig. 5.8 	F-15B lift coefficient wind tunnel data.
184 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 200 of 650 --

5.3.3 	Aircraft Aerodynamic Pitching Moment
As seen in Sec. 1.3.4.2, aircraft pitching moment may be expressed using
the pitching moment coefficient as
M a ¼ Cm qqS cc 	ð5:34Þ
Cm represents the total aircraft pitching moment coefficient, and we will again
express it using a first-order Taylor series expansion with a, ih, and de.
C m ¼ Cm0 þ Cma a þ C mih
ih þ C mde
de 	ð5:35Þ
The moment coefficient is also a function of dynamic pressure (to account for
aeroelastic effects), Mach number, Reynolds number, and the center of gravity
location (or moment reference center) of the aircraft. Cm0 , Cma , Cm ih
, and C mde
must be defined for the appropriate Mach number, Reynolds number, cg loca-
tion, and dynamic pressure (if aeroelastic effects are considered).
5.3.3.1 	C m0 and C ma. 	To estimate C m0 and the derivative terms in Eq.
(5.35), we will again consider the aircraft as two components: the wing-fuselage
and the horizontal tail. Figure 5.5 should be referred to using the cg as the
moment reference center. Neglecting the effect on pitching moment of wing-
fuselage and horizontal tail drag, it can be seen that the aerodynamic pitching
moment about the cg is
M A ¼ M AC wf þ Lwf ðx cg  x ACwf Þ cos a
 L hðx ACh  x cg Þ cosða  eÞ ð5:36Þ
For most cases, the cosine terms in Eq. (5.36) are very close to one because
the angles are small. With this assumption, we recast Eq. (5.36) in coefficient
form by nondimensionalizing with respect to qqS cc.
Cm ¼ C m ACwf
þ CL wf
ðx cg  x AC wf Þ
cc  CL h Zh
S h
S
ðx ACh  x cg Þ
cc ð5:37Þ
The distances x cg , x AC wf , and x ACh are now conveniently expressed in nondi-
mensional form as
xx cg ¼ x cg
cc ð5:38Þ
xx AC wf ¼ x AC wf
cc ð5:39Þ
xx AC h ¼ x AC h
cc ð5:40Þ
remembering that cc is the wing mean chord.
AIRCRAFT STATIC STABILITY 	185

-- 201 of 650 --

We now assume C L0h
equals zero and substitute Eqs. (5.20), (5.21), (5.26),
(5.27), and (5.38–5.40) into Eq. (5.37) to obtain
C m ¼ C mACwf
þ ðCL0wf
þ CLawf
aÞðxx cg  xx AC wf Þ
 C Lah
Zh
S h
S ðxx AC h  xx cg Þ a  	e0 þ de
da a
 	
þ i h þ tede
 	 	ð5:41Þ
We are now in a position to define Cm0 and the derivative terms in Eq. (5.35).
Setting a, i h, and de equal to zero in Eq. (5.41), we have
Cm0 ¼ C mACwf
þ C L0wf
ðxx cg  xx AC wf Þ þ CLah
Zh
S h
S ðxx ACh  xx cg Þe0
 C mACwf
þ CL0wf
ðxx cg  xx AC wf Þ if e0 is negligible
ð5:42Þ
Taking the partial derivative of Eq. (5.41) with respect to a, we have
Cma ¼ CLawf
ðxx cg  xx ACwf Þ  C Lah
Zh
S h
S ðxx AC h  xx cg Þ 1  de
da
 	
ð5:43Þ
5.3.3.2 	C m ih
and Cmde
. 	Cm ih
and C mde
are obtained through partial differ-
entiation in a similar manner. The tail volume ratio, VV , is introduced to simplify
these expressions. It is also useful early in the aircraft design process to do
preliminary sizing of the horizontal tail.
VV h ¼ S h
S
 	
ðxx ACh  xx cg Þ 	ð5:44Þ
Cm ih
¼ C Lah
Zh
S h
S ðxx AC h  xx cg Þ ¼ CLah
Zh VV h 	ð5:45Þ
C mde
¼ C Lah
Zh VVhte 	ð5:46Þ
As discussed in Sec. 5.2, Cma is the static longitudinal stability derivative. C mih
and C mde
are longitudinal control power derivatives.
In summary, we have developed a detailed method to approximate the aero-
dynamic pitching moment using a first-order Taylor series expansion. To once
again put things in perspective, remember that
M a1s
¼ M a ¼ Cm qqS cc ¼ ðCm0 þ Cma a þ C mih
ih þ Cmde
deÞqqS cc 	ð5:47Þ
Notice that M a is the same for either the body or stability axis because the
transformation rotates about the number two (or y) axis. The y axis is the same
for either system and is also the axis that pitching moment is defined about.
Figure 5.9 illustrates the effect of changing i h and de on a C m vs alpha
graph. As shown, the magnitude of the curve shift is directly proportional to
186 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 202 of 650 --

the magnitude of C m ih
and C mde
. A positive i h deflection is defined as leading
edge up so that a positive i h deflection produces a negative increment on pitch-
ing moment. Remember that a positive de deflection is defined as trailing edge
down that produces a negative increment on pitching moment.
The relative magnitude of Cm ih
and C mde
is dependent on the ratio of the
horizontal tail chord percentage to the elevator chord percentage. For example,
if the elevator is 33% chord, the horizontal tail will be 67% chord and the ratio
of C mih
to C mde
will be approximately two to one.
Figure 5.10 presents pitching moment vs angle of attack data for the F-15B
aircraft. 1 Notice the negative slope of each curve indicating static longitudinal
stability, and also notice that the curves shift upward as i h becomes more nega-
tive.
Some aircraft, such as the F-18 with canted twin vertical tails, use inboard
or outboard rudder deflection to augment pitching moment control power. 2 If
this is the case, an additional term is included in the pitching moment Taylor
series Eq. (5.47) to account for the pitching moment because of asymmetrical
rudder deflection. For such aircraft, longitudinal and lateral-directional motion
is referred to as coupled.
5.3.3.3 	Aircraft 	aerodynamic 	center. 	The 	aerodynamic 	pitching
moment characteristics of the wing-fuselage and horizontal tail may together
be represented at a very convient point for the entire aircraft. This point is called
the aircraft aerodynamic center (AC). Similar to the AC for an airfoil, discussed
in Sec. 1.3.4.3, the aircraft AC is that point on the aircraft where the variation of
aircraft pitching moment coefficient with angle of attack is zero. The location of
the aircraft AC is normally defined with respect to the mean chord of the wing
using the bar notation. For example,
xx AC  x AC
cc ð5:48Þ
To develop an expression for the aircraft AC, we use: 1) the definition which,
in other words, says that Cma must be equal to zero at the aircraft AC if the
Fig. 5.9 	Effect of i h and de on Cm vs alpha characteristics.
AIRCRAFT STATIC STABILITY 	187

-- 203 of 650 --

aircraft is rotated about the AC; and 2) the fact that the c.g. of the aircraft (the
moment reference center) must be at the AC if the aircraft is rotating about the
AC. Thus, we have
If 	Cma ¼ 0; 	ð5:49Þ
then 	xxcg ¼ xx AC 	ð5:50Þ
Applying these constraints to Eq. (5.43) and solving for the aircraft AC, we
have
xxAC ¼
xx ACwf þ CLah
C Lawf
Zh
S h
S xx ACh 1  de
da
 	
1 þ C Lah
CLawf
Zh
S h
S 1  de
da
 	 	ð5:51Þ
Notice that the aircraft AC may be moved aft on the aircraft by increasing
xxAC h , S h, and=or CLah
. This approach can be very useful in designing an aircraft
for static stability. As we will see, moving the aircraft AC aft will increase
static longitudinal stability, and moving it forward decreases static stability for
a given c.g. location.
Fig. 5.10 	Pitching moment wind tunnel data for the F-15B aircraft.
188 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 204 of 650 --

Example 5.1
Estimate the location of the aircraft aerodynamic center for the A-10 given
the following:
S ¼ 506 ft 2 	S h ¼ 120 ft 2 	Zh  0:9
AR ¼ 6:54 	AR h ¼ 3:0 de
da  0:1
cc ¼ 8:8 ft 	x AC h ¼ 26:25 ft
Neglect any fuselage effects and assume a span efficiency factor of 0.9 for the
wing and tail.
We first look at Eq. (5.51) and see that we must determine CLawf
and CLah
.
Using Eq. (1.30),
CLawf
¼ Cla
1 þ 57:3Cla
peAR
¼ 0:11
1 þ 57:3ð0:11Þ
ð3:14Þð0:9Þð6:54Þ
¼ 0:082=deg
CLah
¼ 0:11
1 þ 57:3ð0:11Þ
ð3:14Þð0:9Þð3:0Þ
¼ 0:0631=deg
For a subsonic aircraft such as the A-10 and neglecting fuselage effects, we
know that
xxAC wf  0:25
Also,
xx ACh ¼ x AC h
cc ¼ 26:25
8:8 ¼ 2:98
We are now ready to use Eq. (5.51).
xx AC ¼
xx ACwf þ CLah
CLawf
Zh
S h
S xx AC h 1  de
da
 	
1 þ CLah
C Lawf
Zh
S h
S 1  de
da
 	
¼
0:25 þ 0:0631
0:082 ð0:9Þ 120
506 ð2:98Þð1  0:1Þ
1 þ 0:0631
0:082 ð0:9Þ 120
506 ð1  0:1Þ
xx AC ¼ 0:602
AIRCRAFT STATIC STABILITY 	189

-- 205 of 650 --

Notice that the AC of the aircraft is aft of the wing AC. This is to be expected
with aft tail aircraft.
5.3.4 	Thrust Forces and Moments
Longitudinal forces and moments resulting from engine thrust must also be
defined to complete the applied forces and moments side of the aircraft equa-
tions of motion. We will only consider direct thrust effects on the aircraft.
Indirect thrust effects, such as jet exhaust impinging on lifting surfaces, will be
ignored. In addition, the orientation of the thrust vector produced by the
engine or engines will be assumed to be in the xz body axis plane (no side
force components). These assumptions lead to a simple representation of the
thrust forces and moments in the body and stability axis using Fig. 5.11.
In the stability axis, the thrust forces and moments are
F T x1s
¼ T cosðfT þ a1Þ 	ð5:52Þ
FT z1s
¼ T sinðfT þ a1Þ 	ð5:53Þ
M T1s
¼ M T1 ¼ T dT 	ð5:54Þ
In the body axis, they simplify to
FT x1b
¼ T cos fT 	ð5:55Þ
F T z1b
¼ T sin fT 	ð5:56Þ
M T1b
¼ MT1s
¼ TdT 	ð5:57Þ
Fig. 5.11 	Thrust forces and moments.
190 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 206 of 650 --

5.4 	Longitudinal Static Stability
As discussed in Sec. 5.1, static stability refers to the initial tendency of an
airplane, following a disturbance from steady-state flight, to develop aerody-
namic forces and moments that are in a direction to return the aircraft to the
steady-state flight condition. For purposes of this text, longitudinal static stabi-
lity will primarily refer to aircraft pitching moment characteristics and will
be analyzed for the stick fixed condition (see Sec. 10.5). As discussed in
Sec. 5.2, the sign of the stability derivative, Cma , is key in determining the
static longitudinal stability of an aircraft. The requirement to trim the aircraft at
usable angles of attack is also discussed with the longitudinal stability require-
ment because both are generally necessary to achieve acceptable flight charac-
teristics.
5.4.1 	Trim Conditions
The general requirement for longitudinal trim is that the overall pitching
moment acting on the aircraft be equal to zero, or, in coefficient form
Cm ¼ 0 	ð5:58Þ
The total pitching moment includes both aerodynamic and thrust contributions.
Referring to Fig. 5.12 for a tail-aft aircraft configuration, we can do a simple
moment balance to satisfy the trim condition.
Lwf ðx cg  x AC wf Þ þ M ACwf  Lhðx AC h  x cg Þ  TdT ¼ 0 	ð5:59Þ
This relationship allows us to solve for Lh, the lift on the horizontal tail
required to trim.
L h ¼ L wf ðx cg  x AC wf Þ þ MAC wf  T dT
ðx AC h  x cg Þ ð5:60Þ
For a tail-aft airplane, ðx AC h  x cg Þ is positive, M ACwf is normally negative
because of positive wing camber, L wf is positive, and TdT will be assumed
Fig. 5.12 	Trim moments for a conventional aircraft.
AIRCRAFT STATIC STABILITY 	191

-- 207 of 650 --

small. With x cg less than or equal x ACwf , it can be seen that a down load
ðLh < 0Þ is needed to trim. If x cg is greater than x ACwf , (an unstable wing-fuse-
lage combination), the load on the horizontal tail may be either up or down
depending on the magnitude of M ACwf .
We can also think of the trim condition in terms of Eq. (5.4). For a trim
condition,
Cm0 þ C ma a þ Cmde
de þ Cm ih
i h ¼ 0 	ð5:61Þ
Referring to Fig. 5.3, it can be seen that another requirement for trim is the
ability to trim the aircraft at a positive angle of attack. This is generally accom-
plished by keeping
C m0 þ Cm ih
ih > 0 	ð5:62Þ
in Eq. (5.4). Because the primary requirement for longitudinal static stability is
Cma negative (the slope of the graph in Fig. 5.3), it can be seen that the Eq.
(5.61) requirement keeps the vertical intercept positive so that the aircraft can
be trimmed at a positive angle of attack. The C mde
de term in Eq. (5.4) allows
adjustment of the trim angle of attack by varying the elevator deflection (de) as
illustrated in Fig. 5.13.
Equation (5.61) can be used to develop an expression for the elevator
required to trim the aircraft. By simply solving for de, we have
detrim ¼  C m0 þ Cma a þ Cm ih
i h
C mde
ð5:63Þ
Fig. 5.13 	Pitching moment vs angle of attack with various elevator deflections.
192 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 208 of 650 --

Because CL and alpha have approximately a linear relationship for angles of
attack below the stall, the contribution of the term C Ma a can also be repre-
sented by C MCL
CL, or
detrim ¼  Cm0 þ C mCL
CL þ Cm ih
i h
C mde
ð5:64Þ
Figure 5.14 presents a typical graph of detrim as a function of CL.
Typically, at lower values of lift coefficient (higher speeds), positive values
of de (trailing edge down) are required. This equates to coming forward with
the stick. At higher values of lift coefficient (lower speeds), negative values of
de (trailing edge up) are required, which equates to aft stick.
If we combine C m0 and C mih
i h into one term that meets the criteria of Eq.
(5.62), Eq. (5.64) becomes
detrim ¼  Cm0 þ Cm ih
i h
Cmde
 C mCL
CLtrim
Cmde
or, in simpler terms
detrim ¼ de0  Cm CL
C Ltrim
C mde
ð5:65Þ
where
de0 ¼  Cm0 þ C mih
i h
C mde
de0 can be thought of as the elevator required to trim the aircraft at a lift coeffi-
cient of zero.
Fig. 5.14 	Elevator deflection required to trim as a function of lift coefficient.
AIRCRAFT STATIC STABILITY 	193

-- 209 of 650 --

5.4.2 	Stability Requirements
The primary requirement for longitudinal static stability is
C ma < 0 	ð5:66Þ
As discussed in Sec. 5.2, this requirement provides an aerodynamic restoring
moment for angle of attack perturbations to steady-state flight. As seen in Fig.
5.3, a negative Cma results in a negative slope on C m vs alpha plots.
For a simple vehicle in flight, like a projectile, a negative Cma is achieved
by simply locating the c.g. in front of the AC. From Fig. 5.15, we can see
that an airfoil with negative camber (positive C mAC ) will be able to achieve trim
(Cm ¼ 0) and will also be statically stable if the c.g. is located in front of the
AC.
Because the airfoil will rotate about the c.g. in flight, we can analyze a
perturbed increase in angle of attack from trimmed flight (Fig. 5.15b) and a
perturbed decrease in angle of attack from trimmed flight (Fig. 5.15c). Notice
in Fig. 5.15b that a perturbed increase in angle of attack results in an increase
in the lift force. Because the lift vector is represented at the AC, and is located
behind the c.g., a negative (nose down) pitching moment results in response to
the perturbation. This design is statically stable because this moment provides
an initial tendency for the airfoil to return to trim (equilibrium). The same
analysis applies to Fig. 5.15c for a perturbed decrease in angle of attack.
Figure 5.16 presents each case on a Cm vs alpha plot. Note again that a nega-
tive C ma is required for static stability.
For a conventional tail-aft aircraft, Eq. (5.43) may be used to compute Cma
so that the static stability requirement can be checked. However, use of the
overall aircraft AC Eq. (5.51) is generally more useful from an analysis
Fig. 5.15 	Trimmed and perturbed flight conditions for a statically stable airfoil.
194 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 210 of 650 --

standpoint. Because Cm AC remains constant with changes in angle of attack (per
the definition of aerodynamic center), Cma becomes
M cg ¼ Lðx cg  x AC Þ þ M AC
C mcg ¼ C Lðxx cg  xx AC Þ þ C mAC
Cma ¼ C La ðxx cg  xx AC Þ 	ð5:67Þ
Because CLa is positive for lift coefficients below C Lmax (the normal CL range
for flight), it can be seen that xx AC (for the aircraft) must be larger than xx cg for
C ma to be negative. In simple terms, the c.g. must be in front of the aircraft
a.c. for longitudinal static stability (Cma negative).
A conventional tail-aft balsa wood glider illustrates this principle nicely. The
c.g. is moved forward with a weight such as a metal clip or ball of clay so that
it is front of the AC. This allows it to achieve stable flight. If the weight is
removed, the glider will pitch up or down (depending on the initial angle of
attack) when launched because the c.g. is now behind the a.c. and the aircraft
is statically unstable.
5.4.3 	Neutral Point and Static Margin
For neutral static stability, Cma will be equal to zero. This equates to a hori-
zontal line on a C m vs alpha graph as shown in Fig. 5.17.
As shown, the aircraft will pitch up for any angle of attack condition. This
may not seem consistent with the definition of neutral static stability discussed
in Sec. 5.1. However, because of the Eq. (5.62) requirement for C m0 þ C mih
i h
to be greater than zero, notice that a C ma equal to zero (a zero slope) results in
Cm being equal to the constant value of C m0 þ Cm ih
i h. If Cm0 þ C mih
i h were set
equal to zero and we had Cma equal to zero, then the C m characteristics would
remain zero for any angle of attack (a horizontal line coinciding with the hori-
zontal axis) and theoretically the airplane could be trimmed at any angle of
attack and would not return or diverge following a disturbance.
The condition for neutral static stability is important because it represents
the boundary between static stability and instability. As seen from Eq. (5.67),
Fig. 5.16 	C m vs alpha characteristics for a statically stable airfoil.
AIRCRAFT STATIC STABILITY 	195

-- 211 of 650 --

Cma equal to zero is achieved if xx cg equals xx AC . In physical terms, locating the
c.g. at the A.C. of the aircraft will result in an aircraft with neutral static stabi-
lity. As a result, the aircraft a.c. location is also called the stick fixed neutral
point (see Sec. 10.5), or simply the Neutral Point of the aircraft.
xx AC ¼ xx NP 	ð5:68Þ
If the c.g. is located aft of the neutral point, the aircraft will be statically
unstable (longitudinally) and Cma will be positive. Equation (5.51) allows
prediction of the neutral point or aerodynamic center for an aircraft.
Another useful concept to longitudinal static stability is that of static
margin. Starting with Eq. (5.67), we define static margin (SM) as
SM ¼ xx AC  xx cg ¼ ðxx cg  xx AC Þ ¼ xx NP  xx cg 	ð5:69Þ
Notice that the static margin is simply the distance that the c.g. is in front of
the aircraft a.c. normalized (divided) with respect to the mean wing chord.
Because CLa will be positive for lift coefficients below stall, it can be seen that
a positive static margin will result in a negative C ma . Thus, a positive static
margin results in positive longitudinal static stability. A negative static margin
results in negative static stability and neutral longitudinal static stability is
associated with a static margin equal to zero.
Referring to Eqs. (5.67) and (5.69), we have
Cma ¼ C La ðSM Þ 	ð5:70Þ
and
SM ¼  C ma
CLa
¼ Cm CL
ð5:71Þ
Fig. 5.17 	C m vs alpha characteristics for a neutral longitudinal stability.
196 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 212 of 650 --

Thus, the derivative CmCL
, the slope of a plot of Cm vs C L (which is similar to
a Cm vs alpha plot), is directly proportional to the static margin. The negative
of the slope of a C m vs C L graph will be the static margin as indicated in Fig.
5.18.
If we take the derivative of Eq. (5.64) with respect to lift coefficient, we
have
@de
@CL
¼  Cm CL
Cmde
ð5:72Þ
This relationship becomes useful from a flight test standpoint because de can
be instrumented and measured on an aircraft, and CL can be computed for
trimmed flight if weight, airspeed, and altitude are recorded. As the c.g. of the
aircraft is moved aft toward the tail, C m CL
becomes less negative and eventually
equals zero when the c.g. is located at the neutral point. Thus, the neutral point
is achieved when the change in de with respect to CL is equal to zero. This
relationship is illustrated in Fig. 5.19.
To determine the neutral point location in flight test, a series of trim points
are flown with several different c.g. locations to generate curves similar to
those presented in Fig. 5.19. Of course, the aircraft is not flown with the c.g.
at the neutral point because neutral stability would result. The location of the
Fig. 5.18 	Cm vs CL characteristics for an aircraft with a positive static margin.
Fig. 5.19 	Trim de vs C L.
AIRCRAFT STATIC STABILITY 	197

-- 213 of 650 --

neutral point is extrapolated by plotting the slope of each de vs C L line (for
each c.g. location) with respect to c.g. location as illustrated in Fig. 5.20.
Example 5.2
For the A-10 of Example 5.1, determine the static margin, Cma , and Cm CL
if
xx cg is 0.5. Is the aircraft statically stable in pitch?
From Eq. (5.69), the static margin is
SM ¼ xx AC  xx cg ¼ 0:602  0:5 ¼ 0:102
Because the static margin is positive, the aircraft is statically stable in pitch.
We can also see this because the c.g. is in front of the aircraft AC. To deter-
mine Cma we will use Eq. (5.70) but first we must determine CLa for the
aircraft. From Eq. (5.30) we have,
CLa ¼ CLawf
þ C Lah
Zh
S h
S 1  de
da
 	
¼ 0:082 þ 0:0631ð0:9Þ 120
506 ð1  0:1Þ
CLaaircraft
¼ 0:0941=deg
Using Eq. (5.70), we have
Cma ¼ C La ðSM Þ ¼ ð0:0941Þð0:102Þ ¼ 0:0096=deg
Eq. (5.71) is used to determine Cm CL
.
Cm CL
¼ SM ¼ 0:102
5.4.4 	Maneuvering Flight and Maneuver Point
Longitudinal maneuvering flight includes maneuvers where the load factor is
not equal to one and the aircraft has a pitch rate. Typical maneuvering flight
involves load factors above one where the aircraft is pulling g. To analyze this
Fig. 5.20 	Flight test neutral point determination.
198 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 214 of 650 --

condition from a pitching moment standpoint, Eqs. (5.4) and (5.61) must be
modified with an additional term called the pitch damping derivative (C mq ).
Equation (5.4) becomes
Cm ¼ Cm0 þ Cma a þ C mde
de þ Cm ih
i h þ Cm q Q 	ð5:73Þ
For trim, Eq. (5.61) becomes
0 ¼ C m0 þ Cma a þ Cmde
de þ C mih
ih þ Cm q Q 	ð5:74Þ
Cm q provides a damping moment that opposes the pitch rate of the aircraft. It
results from the incremental change in horizontal tail angle of attack because
the aircraft has a pitch rate. This damping effect is similar to the effect a shock
absorber would have if it were attached to the tail of a suspended aircraft that
was allowed to rotate in pitch about the c.g. Figure 5.21 illustrates the change
in horizontal tail angle of attack that provides the damping effect on a tail aft
aircraft configuration.
A positive (nose up) pitch rate on the aircraft (Q1 ) produces a downward
velocity at the horizontal tail, Q1Xh. This downward velocity produces an
increase in the angle of attack at the horizontal tail, Dah.
Dah ffi Q1X h
U1
ð5:75Þ
using the small angle assumption and keeping Dah in radians.
The increased angle of attack, in turn, produces an increase in lift, which
results in a nose down moment (DLðX hÞ) opposing the direction of the pitch
rate, Q1 . This is where the pitch damping effect comes from. Pitch damping
provides a stabilizing effect on the dynamic stability of the aircraft because it
tends to damp out oscillations. It also changes the elevator required for trim in
maneuvering flight over that predicted with Eq. (5.65) for level 1-g flight.
We previously defined in Eq. (5.21) the angle of attack at the horizontal tail
as
ah ¼ a þ ih þ tede  e
Fig. 5.21 	Change in horizontal tail angle of attack because of pitch rate.
AIRCRAFT STATIC STABILITY 	199

-- 215 of 650 --

where
te ¼ @ah
@de
For maneuvering flight, Dah must be added to the expression for ah, or
ah ¼ a þ ih þ tede  e þ Dah 	ð5:76Þ
To determine the change in elevator deflection required to maintain a maneu-
vering trim lift coefficient vs a level flight trim lift coefficient (or the elevator
deflection required to offset Dah), we first realize that te, i h, and e are constant
for a given trim lift coefficient. The change in deðDdeÞ required to maintain a
maneuvering flight trim lift coefficient can be found by realizing that an addi-
tional aerodynamic force must be generated on the horizontal tail in the oppo-
site direction to the increased lift produced by Dah: This offsetting force is
generated with a change in elevator deflection where
teðDdeÞ þ Dah ¼ 0
or
Dde ¼  Dah
te
From Eq. (5.75),
Dde ¼  Q1Xh
U1te
ð5:77Þ
Equation (5.77) will have a negative sign (because te is positive), which indi-
cates that increased trailing edge up elevator (aft stick) is required to hold an
aircraft in a positive (nose up) pitch rate maneuver. This increased elevator
deflection offsets the pitch damping moment produced by Dah so that a given
trimmed lift coefficient can be maintained in steady-state maneuvering flight.
Equation (5.77) can be combined with Eq. (5.65) to develop the expression
for the elevator deflection required to trim in maneuvering flight.
demaneuvering flight ¼ de0  Cm CL
C Ltrim
Cmde
þ Dde
or
demaneuvering flight ¼ de0  Cm CL
C Ltrim
Cmde
 Q1X h
U1te
ð5:78Þ
For a pull-up, recall from Sec. 3.9.3.
Q1 ¼ gðn  1Þ
U1
200 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 216 of 650 --

Equation (5.78) then becomes
demaneuvering flight ¼ de0  Cm CL
CLtrim
Cmde
 gðn  1ÞXh
U2
1 te
ð5:79Þ
for a pull-up.
In addition, we know that C Ltrim for maneuvering flight is
C Ltrim ¼ nW
qqS
Combining, we have
demaneuvering flight ¼ de0  C mCL
nW
C mde
qqS  gðn  1ÞXh
U2
1 te
ð5:80Þ
Equation (5.80) is interesting to evaluate. As load factor increases, the eleva-
tor deflection required for trim increases in a negative sense (more trailing
edge up). Remember, te is positive. Also, as the elevator effectiveness (te)
increases, the elevator required for trim decreases based on the last term
decreasing. As the c.g. is moved aft and C m CL
becomes less negative, less trail-
ing edge up de is required for trim. As the velocity (U1 ) increases, demaneuvering flight
increases, and as the wing loading (W =S) increases, demaneuvering flight becomes more
negative.
The load factor sensitivity of an aircraft is a characteristic that pilots relate
to. This can be expressed as the derivative of Eq. (5.80) with respect to load
factor.
@de
@n ¼  C mCL
W
Cmde
qqS  gX h
U 2
1 te
ð5:81Þ
The second term in Eq. (5.81) is the maneuvering stability contribution.
Analogous to the one g case presented in Eq. (5.72), when @de
@n is equal to
zero, we have neutral static stability for the maneuvering aircraft case. The c.g.
location where this occurs is called the maneuver point.
@de
@n ¼ 0 @ the maneuver point 	ð5:82Þ
It is logical to ask at this point how the maneuver point compares to the
neutral point. The maneuver point is located aft of the neutral point because
the added damping provided by Cm q provides more stability for the maneuver-
ing flight case. Cm q essentially makes the aircraft appear to have a more nega-
tive C ma (or Cm CL
). To define the maneuver point in flight test, a range of c.g.
are flown with the pilot gradually increasing load factor for each c.g. config-
AIRCRAFT STATIC STABILITY 	201

-- 217 of 650 --

uration so that the derivative @de=@n can be evaluated. This is accomplished by
recording load factor and elevator position during the maneuver. The data is
then plotted vs c.g. position and extrapolated to determine the maneuver point
as shown in Fig. 5.22.
In summary, we used the relationship @de=@CL equal to zero to find the
neutralpoint, and the relationship @de=@n equal to zero to find the maneuver
point. All of these discussions are for the stick-fixed case where the elevator is
not allowed to float when the aircraft is in one g or maneuvering flight. This is
the case for aircraft with irreversible flight control systems (that is, hydraulic
powered) and for aircraft with reversible control systems where the pilot main-
tains the stick in a fixed position (see Sec. 10.5 for a discussion of reversible
and irreversible flight control systems). A discussion of the stick-free case may
be found in Ref. 1. As might be expected, the stick-free case occurs with rever-
sible flight control systems where the stick is not fixed and the elevator is
allowed to float. For this situation, the static stability of the aircraft is degraded
and different relationships apply for determination of the stick-free neutral and
maneuver points.
5.5 	Lateral-Directional Applied Forces and Moments
Because we have assumed that longitudinal and lateral-directional motion
are independent of each other, lateral-directional motion is assumed to consist
of roll and yaw rotation and y-axis translation. These two rotations and the
translation are typically coupled (that is, they occur together). We will now
expand the applied lateral-directional aero force and moment terms with
conventional aerodynamic coefficients. In the stability axis, we have
F Ay1s
¼ F Ay 	ðside forceÞ 	ð5:83Þ
LA1s
¼ L A 	ðrolling momentÞ 	ð5:84Þ
NA1s
¼ N A 	ðyawing momentÞ 	ð5:85Þ
Fig. 5.22 	Flight test determination of maneuver point.
202 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 218 of 650 --

Because the body-fixed stability axis will be used consistently for this steady-
state analysis, the subscript 1s will not be carried along in the analysis, but
implied as previously indicated.
5.5.1 	Aircraft Side Force
Aerodynamic side-force acts along the number two stability axis (positive
out the right wing) and may be expressed using the side-force coefficient (C y)
as
Fay ¼ Cy qqS 	ð5:86Þ
Side force is a function of the angle of sideslip (beta or b), aileron deflection
(da), rudder deflection (dr), angle of attack (a), Mach number, and Reynolds
number. A positive sideslip angle (b) is defined in Fig. 5.26. It can be easily
remembered as positive b is ‘wind in the right ear’ for the pilot. Our Taylor
series expansion of the side-force coefficient will include the first three terms.
C y ¼ Cy0 þ Cyb b þ Cyda
da þ Cydr
dr 	ð5:87Þ
Cy0 is the value of Cy for b, da, and dr all equal to zero. It is typically equal to
zero for symmetrical aircraft; however, at high angles of attack, aircraft with
long slender nose configurations may have a nonzero Cy0 because of the shed-
ding of asymmetrical vortices. The derivatives C yb , Cyda
, Cydr
and Cy0 must be
defined at appropriate Mach number, Reynolds number, and angle of attack
conditions.
The derivative Cyb is the change in side force coefficient because of a
change in sideslip angle (at constant angle of attack). It has an important influ-
ence on dutch roll dynamics. The vertical tail is the primary aircraft component
that influences this derivative. Cyb is normally negative because positive side-
slip will typically result in a side force along the negative y axis (out the left
wing), and a negative sideslip angle will result in a positive side force. The
vertical tail can be thought of as a vertical wing with sideslip playing an analo-
gous role to angle of attack. A method to estimate C yb based on aircraft config-
uration begins with the definition of the aero sideforce acting on the vertical
tail using the sideforce coefficient.
FA yvertical tail
¼ Cy qq1S
and
@FA yvertical tail
@b ¼ @C yvertical tail
@b qq1S ¼ C ybvertical tail
qq1S
AIRCRAFT STATIC STABILITY 	203

-- 219 of 650 --

The contribution of the vertical tail to Cyb can be estimated using an approach
similar to that used to develop Eq. (5.30). This results in the following equa-
tion
C ybvertical tail
¼ C Lavertical tail
1  @s
@b
 	
Zvertical tail
Svertical tail
S ð5:88Þ
where s is the sidewash angle (analogous to the downwash angle) and
Zvertical tail is qqvertical tail=qq1. Note the similarity of this equation to Eq. (5.30) for
CLa . The sidewash derivative, @s=@b, is normally small. A complete estimate
of Cyb should also include the contribution of the wing and fuselage. When
computing, CLavertical tail
, Eq. (1.30) may be used with the following approxima-
tion for the aspect ratio of the vertical tail:
ARvertical tail  2ðhvertical tailÞ2
Svertical tail
ð5:89Þ
Equation (5.89) provides a rough estimate for the effective aspect ratio of the
vertical tail based on experimental data for simple aircraft configurations. It
attempts to account for the end-plate effect caused by the horizontal stabilizer
and fuselage. In Eq. (5.89) hvertical tail is the height of the vertical tail and
Svertical tail is the planform area of the vertical tail.
The derivative C yda
is generally insignificant or negligible. However, it can
be significant if rolling moment is generated with control surfaces that are in
close proximity to a vertical surface. For example, on the F-111 aircraft differ-
ential deflection of the left and right stabilators was used to produce rolling
moment when the wings were in the swept back position. This produced a
differential pressure on the vertical tail, which resulted in a side force as illu-
strated in Fig. 5.23 with the B-1 aircraft.
The derivative Cydr
is positive because a positive rudder deflection (trailing
edge left) will generate a side force along the positive y axis. The size of the
vertical tail in relation to the wing, along with the aspect ratio and sweepback
of the vertical tail, determine the magnitude of this derivative.
5.5.2 	Aircraft Rolling Moment
Aircraft rolling moment acts about the x axis and may be expressed using
the rolling moment coefficient as
L a ¼ Cl qqSb 	ð5:90Þ
The rolling moment coefficient is a function of the same parameters we consid-
ered for side force; namely, sideslip angle, aileron deflection, rudder deflection,
angle of attack, Mach number, and Reynolds number. In addition, dynamic
pressure and center of gravity also influence the rolling moment coefficient.
204 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 220 of 650 --

We will again use sideslip angle, aileron deflection, and rudder deflection in
our first-order Taylor series expansion
Cl ¼ Cl0 þ Clb b þ Clda
da þ Cldr
dr 	ð5:91Þ
Cl0 is the value of Cl for b, da and dr all equal to zero. It is typically equal to
zero for symmetrical aircraft; however, it may not be typical for aircraft with
long, slender fore-bodies where asymmetric vortex shedding is present. The
derivatives C lb , C lda
, Cldr
, and C l0 must be defined at appropriate angle of
attack, Mach number, Reynolds number, dynamic pressure, and c.g. conditions.
5.5.2.1 	C lb . 	C lb is the lateral (roll) static stability derivative. It is also
sometimes called the dihedral effect. As will be seen in Sec. 5.6.2.1, the sign of
Clb must be negative if an aircraft has roll static stability. A negative Clb simply
implies that the aircraft generates a rolling moment that rolls the aircraft away
from the direction of sideslip.
Four aspects of an aircraft design primarily influence Clb : geometric
dihedral, wing position, wing sweep, and the contribution of the vertical tail.
In other words,
C lb ¼ C lbdihedral
þ C lbwing position
þ Clbwing sweep
þ Clbv
First, the wing geometric dihedral angle, G (capital gamma), as illustrated
in Fig. 5.24, provides a significant negative contribution to C lb . The larger the
dihedral angle, the more negative rolling moment will result from a positive
Fig. 5.23 	Side force resulting from differential stabilator deflection.
AIRCRAFT STATIC STABILITY 	205

-- 221 of 650 --

sideslip angle and the more positive rolling moment will result from a negative
sideslip angle. This occurs because the wing toward the relative wind (right
wing for positive sideslip and left wing for negative sideslip) experiences a
higher angle of attack than that experienced by the opposite wing. The dihedral
contribution to C lb may be estimated with the following approximation (refer-
ence USAF Academy Glider Design Program) where l is the wing taper ratio
as defined in Eq. (1.25).
C lbdihedral
  1
6 C L awing
G 1 þ 2l
1 þ l ð5:92Þ
Several aircraft such as the F-104, C-5, and C-141, are designed with a
negative dihedral angle or anhedral (the wings are bent down). This design
feature provides a positive contribution to C lb and is normally used to reduce
the magnitude of roll stability because too much roll stability (a large negative
value of C lb ) will have an adverse influence on dutch roll, engine out, and
crosswind landing characteristics.
Wing position on the fuselage is the second design aspect that influences
Clb . A high wing position will provide a negative contribution to C lb , a low
wing position will provide a positive contribution, and a mid-wing position
will provide a fairly neutral contribution. Because sideslip induces a crossflow
over the fuselage as shown in Fig. 5.25, a high wing configuration will experi-
ence a higher wing angle of attack near the wing-fuselage intersection on the
wing toward the relative wind. Likewise, a lower angle of attack will be experi-
enced on the opposite wing near the wing-fuselage juncture, and the asym-
metric lift that results will roll the aircraft away from the direction of sideslip.
The opposite effect will occur with a low wing configuration because the wing
toward the relative wind will experience a reduction in angle of attack and the
wing away from the relative wind will experience an increase in angle of
attack. Thus, a low wing position will tend to roll the aircraft toward the direc-
tion of sideslip. A mid-wing experiences little change in angle of attack near
the wing-fuselage juncture and consequently has little effect on C lb .
Fig. 5.24 	Wing geometric dihedral effects.
206 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 222 of 650 --

A fairly complex estimate for Clbwing position
in terms of aircraft geometry para-
meters can be found in Ref. 3 Eq. (10.34). Horizontal tail position may also
contribute to C lb in a similar manner, and the referenced equation may be used
to estimate this effect.
Wing sweep angle is the third design aspect that influences Clb . As seen in
Fig. 5.26, a sideslip angle results in a side velocity that can be broken into
vector components normal and parallel to the leading edge of each wing. With
aft sweep, the wing toward the velocity vector (the leading wing) has a larger
Fig. 5.25 	Rolling moment because of sideslip with high and low wing positions.
Fig. 5.26 	Rolling moment because of sideslip with an aft-swept wing.
AIRCRAFT STATIC STABILITY 	207

-- 223 of 650 --

normal velocity component than the wing opposite the velocity vector (the
trailing wing). As a result, the upstream wing will produce more lift than the
downstream wing (resulting in a rolling moment away from the sideslip direc-
tion), and a negative contribution will result for C lb. A simplified estimate of
the wing sweep contribution to C lb is presented in Eq. (5.93) for aft sweep
(Reference USAF Academy Glider Design Program).
C lbwing sweep
¼ 2C Lwing
y ACwing
b
 	
sinð2Lleading edgeÞ 	ð5:93Þ
In using this equation, y ACwing is the positive y-body axis distance to the wing
a.c., Lleading edge is the sweep of the wing leading edge in radians, and b is the
wing span. Notice that Clbwing sweep
is directly dependent on the wing lift coeffi-
cient. The analysis is reversed for forward-swept wings. Forward wing sweep
provides a positive contribution to C lb , and Eq. (5.93) may be used as an esti-
mate of this contribution by simply dropping the negative sign.
The last design aspect we will consider is the vertical tail. A positive side-
slip angle will result in an aerodynamic force on the vertical tail in the negative
y-axis direction. Because the vertical tail is normally above the x (or rolling)
axis of the aircraft, this aerodynamic force produces a negative rolling moment
that results in a negative contribution to Clb . A similar analysis holds for nega-
tive sideslip angles. The larger and higher the vertical tail, the more negative
the contribution to C lb . An estimate of the vertical tail contribution to C lb
begins with Eq. (5.88) which defines C ybvertical tail
.
C lbvertical tail
¼ zv
b C ybvertical tail
ð5:94Þ
zv is the vertical distance (z stability axis direction with a change in sign
convention: ‘‘up’’ is positive in the definition of zv) that the aerodynamic
center of the vertical tail is above the aircraft c.g. zv is normally positive;
however, at high angles of attack, some aircraft may have a negative value for
zv (the a.c. of the tail below the c.g., see Fig. 5.27).
zv may be estimated with the following equation for the low angle of attack
case:
zv ¼ 1
3 ðhvertical tailÞ ½1 þ 2lvertical tail
½1 þ lvertical tail
The span, b, is included in Eq. (5.93) to normalize zv. Substituting Eq. (5.88)
into Eq. (5.94), we have:
Clbvertical tail
¼  zv
b CLavertical tail
1  @s
@b
 	
Zvertical tail
Svertical tail
S ð5:95Þ
A T-tail, such as on the F-104, C-141, and C-5, will increase C Lavertical tail
because
the T-tail serves as an end plate to effectively increase the aspect ratio of the
208 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 224 of 650 --

vertical tail by minimizing the tip vortex. This effect results in an increase in
the magnitude of Clbvertical tail
.
To help put these design features in perspective, consider an aircraft such as
the A-7 (Fig. 5.28). It has a high wing, aft sweep, and a large vertical tail.
These features result in a large negative value for Clb. To reduce the absolute
value of C lb (make it less negative) so that dutch roll characteristics and cross-
wind landings will not be a problem, anhedral was included in the design.
Figure 5.29 presents rolling moment wind tunnel data for the F-16 VISTA
aircraft at zero and 35 deg angle of attack.4 Notice the decrease in slope (Clb )
as angle of attack is increased. Angle of attack usually has a very pronounced
effect on C lb .
5.5.2.2 	C lda
. 	Ailerons are typically the primary control surface for produ-
cing rolling moment in response to a pilot command. A positive aileron deflection
results in a positive rolling moment about the x axis (see Sec. 5.2). Ailerons are
generally not deflected symmetrically so that adverse yaw effects can be
minimized. For example, in response to a right stick input, the right aileron
may have a larger trailing edge up deflection that the left aileron has a trailing
edge down deflection. As discussed in Sec. 5.2, we define the magnitude of
aileron deflection (using the convention that trailing edge down is positive) as
da ¼ 1
2 ½daleft  daright  	ð5:96Þ
Fig. 5.27 	Illustration of vertical tail moment arm (zvv).
AIRCRAFT STATIC STABILITY 	209

-- 225 of 650 --

The derivative C lda
defines the change in rolling moment that results from
aileron deflection. It is also called the aileron control power. Clda
is positive
based on the definition of a positive aileron deflection. The magnitude of Clda
depends on several factors. The aileron chord to wing chord ratio is a measure
of the relative size of the aileron in terms of wing chord. The larger the ratio,
the larger C lda
becomes. The aileron span location on the wing determines the
moment arm and length of the ailerons. The larger the moment arm (the
further outboard) and the longer the length, the larger Clda
becomes. The
magnitude of aileron deflection is also a factor in defining the magnitude of
Clda
. Aileron deflections greater than about 20 deg may result in flow separation
over the top surface, which will decrease C lda
. The wing angle of attack must
also be considered. For conditions near wing stall, a small downward aileron
deflection can result in flow separation and a decrease in Clda
. Another factor
to be considered is the wing sweep angle. Sweep angles greater than approxi-
mately 55 deg generally result in outward spanwise flow, which is nearly paral-
lel to the aileron hinge line. This will reduce the magnitude of C lda
. Clda
also
depends on dynamic pressure because of aeroelastic effects when our assump-
tion of a rigid body does not hold. Many high-performance aircraft experience
aileron reversal above a specific dynamic pressure because the twisting loads
on the wing resulting from an aileron deflection (combined with the flexibility
of the wing structure) are sufficient to make C lda
negative. Mach number is
another factor that influences C lda
. For example, in the tran-sonic region shock-
wave formation can reduce the magnitude of C lda
:
Some airplane designs also use spoiler and=or differential stabilizer control
to generate rolling moment. For these designs, appropriate additional terms
Fig. 5.28 	Three-view drawing of A-7 corsair.
210 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 226 of 650 --

must be included in the Taylor series expansion for rolling moment [Eq.
(5.91)]. Most of the factors discussed previously also influence the effective-
ness of spoilers and=or differential stabilizer control.
Roll control power is generally an important requirement in high-perfor-
mance aircraft. As an example, the roll performance of the YF-17 was found
to be unacceptable during initial Air Force flight evaluations because of the
aeroelastic aileron reversal effect. The flight control system was modified
during the flight program to use additional differential horizontal tail to
increase the overall roll control power. This modification improved the roll
control power, however additional improvements were also required.2 Almost
all modern fighter aircraft use differential horizontal tail for roll control in
some portion of the flight envelope. In fact, the supersonic RA-5C Vigilante
abandoned ailerons altogether. It used multiple sets of spoilers, deflectors, and
differential horizontal tail for roll control. Another approach is that of the
F-16, which has a single trailing edge control device, a flaperon, that doubles
as both aileron and trailing edge flap.
Fig. 5.29 	Rolling moment wind tunnel data for F-16 VISTA aircraft.
AIRCRAFT STATIC STABILITY 	211

-- 227 of 650 --

5.5.2.3 	C ldr
. 	A rudder deflection can also generate a rolling moment. As
discussed in Sec. 5.5.1, a positive rudder deflection (trailing edge left) will
generate a side force in the direction of the positive y axis. Because the rudder and
vertical tail are normally above the rolling axis of the aircraft, this side force also
results in a positive rolling moment. Thus, C ldr
will be positive for most aircraft.
Using the same rationale, a trailing edge right (negative) rudder deflection will
result in a negative rolling moment. C ldr
can reverse sign from positive to negative
for high angle of attack conditions. At high angles of attack, the vertical tail can
be positioned below the x stability axis, causing the moment arm to be below the
rolling axis of the aircraft.
5.5.3 	Aircraft Yawing Moment
Aircraft yawing moment acts about the z axis and may be expressed using
the yawing moment coefficient as
N a ¼ C n qqSb 	ð5:97Þ
The yawing moment coefficient is a function of the same parameters we
considered for rolling moment coefficient, with the exception of dynamic pres-
sure that usually has an insignificant effect. These parameters are again sideslip
angle, aileron deflection, rudder deflection, angle of attack, Mach number,
Reynolds number, and center of gravity location. Sideslip angle, aileron deflec-
tion, and rudder deflection will again be used in our first-order Taylor series
expansion.
C n ¼ C n0 þ Cnb b þ Cnda
da þ Cndr
dr 	ð5:98Þ
Cn0 is the value of C n for b, da, and dr all equal to zero. Like Cl0 , it is typi-
cally equal to zero for symmetrical aircraft; however, it may not be for aircraft
with long, slender forebodies where asymmetric vortex shedding is present.
The derivatives Cnb , Cnda
, Cndr
, and C n0 must be defined at appropriate angle of
attack, Mach number, Reynolds number, and c.g. conditions.
5.5.3.1 	C nb . 	Cnb is the directional (yaw) static stability derivative. It is
sometimes called the weathercock stability derivative. As will be seen in Sec.
5.6.2.2, the sign of C nb must be positive if the aircraft has yaw static stability. A
positive C nb implies that in response to a sideslip angle, the aircraft will generate
an aerodynamic yawing moment, which tends to reduce or zero-out the sideslip.
For example, a positive C nb will result in a positive yawing moment being
generated in response to a positive sideslip angle. This yawing moment will tend
to yaw the aircraft toward the relative wind and reduce the sideslip angle. We can
also think of this as the weathervane effect.
The vertical tail is the primary aircraft component that drives the magnitude
of C nb . The larger the vertical tail, the more positive Cnb will be. The x-axis
distance between the c.g. and the a.c. of the tail is another design feature that
212 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 228 of 650 --

influences Cnb . The larger this distance, the more positive C nb will be.
Cnbvertical tail
may be estimated by again starting with Eq. (5.88).
C nbvertical tail
¼  xv
b C ybvertical tail
ð5:99Þ
where xv is the distance from the aerodynamic center of the vertical tail to the
aircraft c.g. (along the x stability axis). Substituting Eq. (5.88) into Eq. (5.99),
we have
Cnbvertical tail
¼ CLavertical tail
1  @s
@b
 	
Zvertical tail
Svertical tailxv
Sb ð5:100Þ
A complete estimate of Cnb should also include the contribution of the wing
and fuselage.
Aft wing sweep also provides a positive contribution to C nb . As seen in Fig.
5.26, higher lift is generated on the upstream wing (wing toward the sideslip),
resulting in more induced drag than on the downstream wing. This results in a
stabilizing yawing moment that will yaw the aircraft toward the relative wind,
thus reducing sideslip. Aft wing sweep is the major contribution to Cnb for a
flying wing aircraft such as the B-2.
Maintaining a sufficiently positive C nb at high angles of attack presents a
challenge to aircraft designers. Flow separation from the wing may reduce the
dynamic pressure experienced by a significant portion of the vertical tail. If
this happens, Cnb is reduced in magnitude. A large vertical stabilizer may be
designed for the aircraft to maintain sufficient directional stability under these
conditions. A better option might be twin vertical tails as used on the F-18.
For example, the F-16, with its single vertical tail, loses directional stability at
high angles of attack and, as a result, incorporated an angle of attack limiter in
the flight control system. Its competitor, the YF-17 (F-18 predecessor) had
twin vertical tails canted outboard, which retained the directional stability of
the aircraft at high angles of attack better than the F-16 because the lateral
location and cant of the tails placed them out of the separated flow from the
fuselage. 2 This is one of the reasons that the F-22 and some Russian aircraft,
such as the MIG-29, use similar tail designs.
Figure 5.30 presents yawing moment wind tunnel data for the F-16 VISTA
aircraft at zero and 35 deg angle of attack. 4 Notice the positive slope indicating
a positive C nb for an angle of attack of 0 deg. Also notice the negative C nb for
35 deg angle of attack (indicating an unstable situation). Angle of attack
usually has a very pronounced effect on C nb because of the blanking of the
vertical tail.
5.5.3.2 	C nda
. 	The derivative C nda
defines how yawing moment changes
with aileron deflection. For aircraft equipped with conventional ailerons, Cnda
is
typically negative, indicating that adverse yaw is generated as a result of the
control input. This means that a positive aileron input (right wing down) will have
AIRCRAFT STATIC STABILITY 	213

-- 229 of 650 --

a nose left yawing moment result. This yawing moment away from the direction
of the turn results from the differential induced drag. A TED aileron deflection
reduces the lift on the wing being rolled into, while a TED aileron deflection
increases the lift on the wing coming up. With the induced drag higher on the
wing coming up, a yawing moment away from the direction of the turn is
generated. This is illustrated in Fig. 5.31. Many aircraft incorporate an aileron to
rudder interconnect (ARI), which automatically inputs a rudder deflection in the
direction of the turn to compensate for adverse yaw.
Cnda
may also be positive. This is called a proverse yaw condition and
results when roll control surfaces such as spoilers are used. For example, many
sailplanes use differential spoilers to generate a rolling moment. Lift is
decreased using spoiler deployment on the wing being rolled into. The spoiler
deployment increases drag on the wing at the same time it is decreasing lift.
This increased drag generates a yawing moment in the direction of the turn.
The F-4 Phantom incorporated a combination of these ideas to minimize
adverse yaw. The lateral control system incorporated both ailerons, spoilers,
and an aileron to rudder interconnect. The ailerons were designed to only
deflect trailing edge down, while the spoilers would only deploy on the wing
being rolled into.
Fig. 5.30 	Yawing moment wind tunnel data for F-16 VISTA aircraft.
214 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 230 of 650 --

5.5.3.3 	C ndr
. 	The rudder is typically the primary control surface for
producing a yawing moment in response to a pilot command. As discussed in
Sec. 5.2, a positive rudder deflection is defined as trailing edge left. The
derivative C ndr
defines the change in yawing moment that results from rudder
deflection. It is also called the rudder control power. C ndr
is negative because a
positive rudder deflection results in a negative yawing moment. The magnitude of
Cndr
depends on several factors. The rudder chord to vertical tail chord ratio is a
measure of the relative size of the rudder in terms of the vertical tail chord. The
larger the ratio, the larger the magnitude of C ndr
. The relative size of the vertical
tail=rudder in relation to the wing size is also a directly proportional factor in
increasing C ndr
. In addition, the aspect ratio and sweep of the vertical tail will
influence the lift–curve slope. The distance between the c.g. and the a.c. of the
vertical tail represents the moment arm that the rudder acts through to produce a
yawing moment. The larger this distance, the larger the magnitude of Cndr
.
Aircraft without a vertical tail such as the B-2 bomber (Fig. 5.32) may use
differential split ailerons (sometimes called drag rudders) to generate a yawing
moment in response to a pilot command. For advanced configurations such as
this, a yawing moment control power derivative is still present with the control
input being differential aileron deflection rather than rudder deflection.
5.6 	Lateral-Directional Static Stability
As discussed in Sec. 5.1, static stability refers to the initial tendency of an
airplane, following a disturbance from steady-state flight, to develop aero-
dynamic forces and moments that are in a direction to return the aircraft to the
Fig. 5.31 	Adverse yawing moment because of aileron deflection.
AIRCRAFT STATIC STABILITY 	215

-- 231 of 650 --

steady-state flight condition. For purposes of this text, lateral-directional static
stability will primarily refer to aircraft rolling moment and yawing moment
characteristics. Lateral and directional stability will be discussed separately, but
it should be realized that rolling and yawing motions are inherently coupled.
This highly coupled behavior necessitates consideration of these motions
together, especially when analyzing and designing lateral-directional handling
qualities.
5.6.1 	Trim Conditions
Lateral-directional trim requirements can be simply stated as achieving a
total aircraft rolling moment and yawing moment of zero. In coefficient terms,
trim equates to
C l and C n ¼ 0 	for trim 	ð5:101Þ
Implied in the idea of lateral-directional trim is typically the condition of a
zero sideslip angle. This condition is more correctly referred to as coordinated
flight (beta equal to zero). Most trim conditions are achieved in coordinated
flight, but it is certainly possible to achieve the trim requirement of Eq. (5.101)
with nonzero sideslip (uncoordinated flight).
The rolling moment coefficient and yawing moment coefficient Taylor series
expansions Eqs. (5.91) and (5.98) provide the first step in satisfying the lateral-
directional trim requirement, Eq. (5.101). With the assumption of a symmetri-
cal aircraft (Cl0 and Cn0 equal to zero) and coordinated flight (b equal to zero),
zero roll and yaw coefficients are achieved simply with da and dr equal to
zero. However, for a nonsymmetrical aircraft or a flight condition where side-
Fig. 5.32 	B-2 Bomber.
216 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 232 of 650 --

slip is not equal to zero, Eqs. (5.91) and (5.98) must be worked together to
determine appropriate values of aileron and rudder deflection for trim.
Example 5.3
Determine the aileron and rudder deflections required for an F-15 to main-
tain a þ1 degree ‘‘wings level’’ sideslip at 0.9 Mach and 20,000 ft. Determine
the value of the sideforce coefficient under these conditions. Applicable deriva-
tives follow:
C y0 ¼ 0 	Cyb ¼ 0:9056=rad 	C yda
¼ 0:0047=rad 	Cydr
¼ 0:1492=rad
C l0 ¼ 0 	Clb ¼ 0:0732=rad 	C lda
¼ 0:0226=rad 	Cldr
¼ 0:0029=rad
Cn0 ¼ 0 	C nb ¼ 0:1638=rad 	Cnda
¼ 0:0026=rad 	C ndr
¼ 0:0712=rad
We start with Eqs. (5.91) and (5.98).
Cl ¼ C l0 þ C lb b þ C lda
da þ Cldr
dr
C n ¼ C n0 þ Cnb b þ Cnda
da þ Cndr
dr
For trim, Cl ¼ C n ¼ 0, and the two equations become
0 ¼ 0:0732 1 deg
57:3
 	
þ 0:0226da þ 0:0029dr
0 ¼ 0:1638 1 deg
57:3
 	
þ 0:0026da þ 0:0712dr
We have two equations with two unknowns, da and dr. Using conventional or
matrix methods such as Cramer’s rule to solve, we have,
da ¼ 0:051 rad ¼ 2:94 deg
dr ¼ 0:042 rad ¼ 2:4 deg
The result makes sense from a sign standpoint. Left rudder (positive) is needed
to generate the sideslip and opposite aileron (positive) is needed to offset the
rolling moment generated by the aircraft’s lateral stability. To calculate the side-
force coefficient, we use Eq. (5.87).
C y ¼ Cy0 þ C yb b þ Cyda
da þ Cydr
dr
C y ¼ 0:9056 1 deg
57:3
 	
þ 0:0047ð0:051Þ þ 0:1492ð0:042Þ
C y ¼ 0:00978
AIRCRAFT STATIC STABILITY 	217

-- 233 of 650 --

Here again, the result makes sense from a direction standpoint. The negative
sign indicates a side force in the negative y direction, which is what will result
from a positive sideslip angle.
5.6.2 	Stability Requirements
As discussed in Secs. 5.5.2.1 and 5.5.3.1, the sign of the stability derivatives
Clb and C nb is key in determining the lateral and directional static stability of
the aircraft.
5.6.2.1 	Lateral motion. 	The requirement for lateral (roll) static stability is
Clb < 0 	ð5:102Þ
and is illustrated in Fig. 5.33.
This requirement results in an aircraft that generates a rolling moment that
rolls the aircraft away from the direction of sideslip. This may seem contrary
to common intuition for coordinated turning flight, but we must think about
the aircraft without pilot inputs and with fixed control surfaces. If an aircraft is
flying straight and level in trimmed flight and encounters air turbulence, which
induces a nonzero bank angle, we would like the aircraft to return to wings-
level flight through its inherent lateral static stability with no pilot input. If the
aircraft is banked to the right, for example, a component of the weight vector
produces a sideforce to the right, which results in a velocity along the positive
y axis (W ). Figure 5.34 illustrates this sideforce with the aircraft experiencing
a perturbation in bank angle. The side velocity, when combined with U , the
forward velocity, results in a positive sideslip condition. If C lb is negative, the
aircraft will roll away from the sideslip and return to wings level, where it
should regain trimmed flight.
Fig. 5.33 	Rolling moment coefficient vs sideslip characteristics for an aircraft with
static lateral stability.
218 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 234 of 650 --

The lateral stability design features discussed in Sec. 5.5.2.1, such as
geometric dihedral, wing position, wing sweep, and vertical tail size, must be
balanced in an overall aircraft design to achieve an acceptable degree of lateral
stability. Too much lateral stability typically results in unacceptable dutch roll
and crosswind landing characteristics. Figure 5.35 compares high-wing and
low-wing general aviation aircraft, namely the Cessna 172 and Piper Cherokee
(both with zero leading-edge sweep and similar vertical tail size). Notice that
the high wing Cessna 172 has no dihedral, whereas the low-wing Cherokee
has significant dihedral. On the Cessna, the high wing position provides suffi-
cient lateral stability without dihedral, whereas the Cherokee needs dihedral to
overcome the destabilizing influence of the low wing position. Both designs
result in acceptable lateral stability.
5.6.2.2 	Directional motion. 	The requirement for directional (yaw) static
stability is
C nb > 0 	ð5:103Þ
and is illustrated in Fig. 5.36.
Fig. 5.34 	Sideforce vector for an aircraft in a bank.
Fig. 5.35 	Two general aviation aircraft.
AIRCRAFT STATIC STABILITY 	219

-- 235 of 650 --

This requirement results in an aircraft that generates a yawing moment that
yaws the nose of the aircraft toward the direction of sideslip. An aircraft with a
positive C nb will generate a positive aerodynamic yawing moment in response
to a positive sideslip angle. Directional stability attempts to keep the aircraft in
a coordinated flight condition where the sideslip angle is equal to zero.
As discussed in Sec. 5.5.3.1, many aircraft experience a decrease in direc-
tional stability (C nb becoming less positive) at high angles of attack because of
separated flow from the wing reducing the dynamic pressure on the vertical
tail. The A-7 Corsair (Fig. 5.28) lost directional stability (C nb < 0) at suffi-
ciently high angles of attack and would experience a ‘‘nose slice’’ in which the
aircraft would yaw away from the direction of sideslip and depart controlled
flight.
5.6.3 	Engine-Out Analysis
The lateral-directional force and moment equations can be used to analyze
the case of an engine failure in flight that results in a yawing moment.
Consider a twin-engine aircraft that has experienced a right engine failure (Fig.
5.37).
The left engine is still operating while the right engine is producing wind-
milling drag. The yawing moment that results is
N ðengine outÞ ¼ NT þ NDD ¼ FT y e þ DDy e 	ð5:104Þ
Notice that for the engine out case presented, the asymmetrical thrust and ram
drag moments are both in the positive direction. For trimmed flight and assum-
ing C n0 is zero, these terms are included in the directional Taylor series.
Cnb b þ Cnda
da þ Cndr
dr þ F T y e
qqSb þ DDy e
qqSb ¼ 0 	ð5:105Þ
Fig. 5.36 	Yawing moment vs sideslip characteristics for an aircraft with static
directional stability.
220 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 236 of 650 --

For a jet aircraft, DD for a windmilling engine can be estimated as 10 to 15%
of the thrust normally produced by the engine. For propeller-powered aircraft,
the windmilling drag is significantly higher than this.
The rolling moment resulting from an asymmetric thrust configuration
should also be considered. For a jet engine configuration with the engines
mounted forward and below the wing, a right engine out configuration will
probably result in a negative rolling moment because at the lower pressure
generated below the left wing by the high velocity exhaust from the operating
engine. Likewise, if the engines are mounted above the wings, like on the
A-10, a right engine failure will probably result in a positive rolling moment.
An aircraft such as the C-17 that incorporates thrust augmented lift will have a
rolling moment toward the inoperative engine because of the loss of lift. The
symbol L T will be used to quantify the rolling moment that results from an
asymmetric thrust configuration. The following lateral Taylor series (assuming
Cl0 is zero) is then appropriate for trimmed flight.
C lb b þ Clda
da þ Cldr
dr þ LT
qqSb ¼ 0 	ð5:106Þ
We will also present the sideforce Taylor series for trimmed flight, including
the gravity term.
C yb b þ Cyda
da þ Cydr
dr þ mg sin F cos g
qqS ¼ 0 	ð5:107Þ
Two options for engine-out flight will now be considered.
Fig. 5.37 	Twin-engine aircraft with the right engine out.
AIRCRAFT STATIC STABILITY 	221

-- 237 of 650 --

Option 1: The aileron and rudder control deflections remain at zero after
engine failure, and the aircraft is allowed to attain a steady-state trim condition
with asymmetric thrust.
A 1-degree-of-freedom (DOF) estimate of the resulting steady-state sideslip
angle can be obtained using only Eq. (5.105) with da and dr equal to zero.
b ffi  FT y e þ DDy e
C nb ðqqSbÞ ð5:108Þ
For the right engine-out case, the resulting steady-state sideslip angle is nega-
tive. Two simplifying assumptions were made in this prediction. First, the
steady-state sideslip angle predicted by Eq. (5.108) will also induce a rolling
moment on the aircraft because of the C lb term in Eq. (5.106). Because b is
negative and C lb is negative, a positive rolling moment will result. It is
assumed that the rolling moment that results from asymmetric thrust (L T ) will
be of equal magnitude and in the opposite direction. If this is not the case,
then Eqs. (5.105–5.107) must be worked together to obtain a 3-DOF solution.
Solution parameters would be sideslip angle, da, and bank angle (f). Second,
it is assumed that the sideslip angle predicted by Eq. (5.108) is within the
range where C nb is linear. Large sideslip angles may stall the vertical tail,
resulting in a lower or even negative value of Cnb . If this is the case, the
aircraft may not achieve a steady-state sideslip angle but may diverge direction-
ally.
Option 2: The rudder is deflected to zero out the sideslip. For the right
engine-out case, this would require left rudder. A 1-DOF estimate of the rudder
required can be obtained using Eq. (5.105) with b and da equal to zero.
dr ¼  FT y e þ DDy e
Cndr
ðqqSbÞ ð5:109Þ
Of course, an exact 3-DOF solution would include Eqs. (5.105–5.107) with
solution parameters of da, dr, and bank angle. Because a trailing-edge left
rudder deflection also produces a sideforce to the right, a bank angle to the left
should be expected from this solution to offset the sideforce because of rudder.
Pilots refer to this condition as ‘‘banking into the good engine’’ to achieve
trimmed flight.
Example 5.4
A C-21 (Learjet) flying with a dynamic pressure (qq) of 86.6 psf has the
following characteristics:
W ¼ 8750 lb 	S ¼ 253 ft 2 	b ¼ 38 ft
Cy0 ¼ 0 	Cyb ¼ 0:0105=deg 	C yda
¼ 0 	C ydr
¼ 0:0021=deg
C l0 ¼ 0 	C lb ¼ 0:00293=deg C lda
¼ 0:0024=deg C ldr
¼ 0:00015=deg
Cn0 ¼ 0 	Cnb ¼ 0:0018=deg 	C nda
¼ 0:0005=deg C ndr
¼ 0:00096=deg
222 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 238 of 650 --

For a right engine failure, F T y e ¼ 11;940 ftlb and L T ¼ 1682 ftlb. Determine
the sideslip angle that results after the engine failure and the rudder deflection
necessary to return the aircraft to zero sideslip using 1-DOF approximations.
The drag on the failed engine can be neglected (DD ¼ 0).
Equation (5.108) will be used to determine a 1-DOF approximation of the
sideslip that results after engine failure with dr ¼ 0.
b ffi  FT y e þ DDye
C nb ðqqSbÞ ¼  11940
ð0:0018Þ½ð86:6Þð253Þð38Þ ¼ 7:97 deg
Notice that the sideslip is negative for a right engine failure. Equation (5.109)
will be used to determine a 1-DOF approximation of how much rudder is
needed to zero out the sideslip with the engine failure.
dr ¼  FT y e þ DDy e
Cndr
ðqqSbÞ ¼  11940
ð0:00096Þ½ð86:6Þð253Þð38Þ ¼ 14:94 deg
The positive sign indicates that left rudder is required for a right engine fail-
ure.
Example 5.5
For the engine-out conditions of Example 5.4, determine the sideslip angle,
rudder deflection, and aileron deflection necessary to keep the wings level
using a 3-DOF solution.
Equations (5.105–5.107) must be solved simultaneously for the three
unknowns: b, dr, and da. The yawing moment equation becomes
C nb b þ C nda
da þ Cndr
dr þ FT y e
qqSb þ DDy e
qqSb ¼ 0
0:0018b þ 0:0005da  0:00096dr þ 11940
ð86:6Þð253Þð38Þ ¼ 0
The rolling moment equation becomes
Clb b þ Clda
da þ Cldr
dr þ LT
qqSb ¼ 0
 0:00293b þ 0:0024da þ ð0:00015Þdr þ 1682
ð86:6Þð253Þð38Þ ¼ 0
and the sideforce equation becomes
C yb b þ Cyda
da þ Cydr
dr þ mg sin F cos g
qqS ¼ 0
 0:0105b þ ð0:0021Þdr ¼ 0
for wings level (f ¼ 0). Conventional techniques (such as Cramer’s rule) are
used to solve this three equation=three unknown problem. The result is
b ¼ 5:45 deg 	dr ¼ 27:26 deg 	da ¼ 4:055 deg
AIRCRAFT STATIC STABILITY 	223

-- 239 of 650 --

Notice that with the 3-DOF solution and the constraint of wings level, that a
large rudder deflection is required. The positive sideslip is a result of the posi-
tive sideforce being generated by the rudder. The positive aileron deflection is
required to counteract the negative rolling moment produced by the lateral
stability (C lb ). A concern is the large rudder deflection required for this case. It
may be near or exceed the effective rudder travel of the aircraft.
Example 5.6
For the engine-out conditions of Example 5.4, determine the sideslip angle,
rudder deflection, and aileron deflection required to maintain a bank angle of
f ¼ 5 deg using a 3-DOF solution.
We will take the same approach as in Example 5.5 but with a bank angle of
5 deg. The yawing moment and rolling moment equations remain
C nb b þ C nda
da þ Cndr
dr þ FT y e
qqSb þ DDy e
qqSb ¼ 0
0:0018b þ 0:0005da  0:00096dr þ 11940
ð86:6Þð253Þð38Þ ¼ 0
and
Clb b þ Clda
da þ Cldr
dr þ LT
qqSb ¼ 0
 0:00293b þ 0:0024da þ ð0:00015Þdr þ 1682
ð86:6Þð253Þð38Þ ¼ 0
Assuming level flight (g ¼ 0), the sideforce equation becomes
Cyb b þ Cyda
da þ Cydr
dr þ mg sin F cos g
qqS ¼ 0
 0:0105b þ ð0:0021Þdr þ ð8750Þ sinð5 degÞ
ð86:6Þð253Þ ¼ 0
A three-equation=three-unknown solution yields
b ¼ 0:98 deg 	dr ¼ 11:67 deg 	da ¼ 2:74 deg
In comparing these results with those of Example 5.5, notice that a moderate
bank angle of 5 deg into the good engine has reduced rudder required by
nearly 16 deg, and that the sideslip angle has become negative. It should also
be realized that a sideslip angle of zero could be achieved with slightly less
bank angle.
Another consideration associated with engine-out flight is the minimum
directional control speed (Vmc). This must be considered because all control
224 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 240 of 650 --

surface deflections have a limited effective range. Simply stated, the minimum
directional control speed is the minimum speed at which an aircraft can main-
tain straight flight for an asymmetrical engine-out condition. The minimum
directional control speed normally involves max rudder deflection and a bank
angle not exceeding 5 deg (with the aircraft banked into the good engine). A
1-DOF estimate of Vmc begins with Eq. (5.105) and the assumption of zero
sideslip, zero bank angle, and that C nda
is negligible.
Cnb b þ Cndr
dr þ F T y e
qqSb þ DDy e
qqSb ¼ 0
The amount of rudder deflection required to maintain zero sideslip (b ¼ 0) is
then
dr ¼ 
FT y e
qqSb þ DDy e
qqSb
Cndr
¼  F T y e þ DDy e
C ndr
qqSb ð5:110Þ
It can be seen from Eq. (5.110) that the magnitude of rudder deflection
required to keep sideslip zero increases as aircraft speed decreases (decreasing
qq). Because maximum rudder travel is generally limited to approximately
25 deg to prevent stalling of the vertical tail, there is a minimum speed at
which zero sideslip can be maintained. If the maximum rudder deflection is
designated drmax , Eq. (5.110) can be solved for V mc.
Vmc ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
2ðF T y e þ DDy eÞ
rCndr
drmax Sb
s
ðfor wings level flightÞ 	ð5:111Þ
Generally, military requirements dictate that Vmc be less than or equal to
1:1Vstall or not more than 10 kn above Vstall . Equation (5.111) also points out
that V mc is inversely proportional to Cndr
, the rudder control power. The
requirement to keep V mc low may be a driving factor in the design of the verti-
cal tail and rudder area because Cndr
must be large enough to meet Vmc
requirements. The effect of bank angle, when determining V mc, is very influen-
tial, and a full 3-DOF analysis, similar to Example 5.6, should be conducted
for an accurate determination. A significant reduction in V mc will be found for
the wing low situation versus that found with a 1-DOF analysis that assumes
zero sideslip and which leads to Eq. (5.111).
5.6.4 	Crosswind Landings
Landing approaches with a component of the wind across the runway can
generally be handled in two ways by a pilot. The first approach is to ‘‘crab into
the wind’’ as illustrated in Fig. 5.38 while maintaining the aircraft in coordi-
nated (zero sideslip angle), wings level flight. The degree of crab is adjusted
until the aircraft ground track aligns with the direction of the runway. This
AIRCRAFT STATIC STABILITY 	225

-- 241 of 650 --

approach works well until the aircraft is at the point of touchdown on the
runway. Then the aircraft must generally align the x-body axis with the runway
direction so that the landing gear wheels are aligned with the direction of
touchdown.
We will analyze the second approach to dealing with a crosswind landing.
In this approach, the aircraft is trimmed with sideslip while the x axis is kept
aligned with the runway direction. As a result, the landing gear is lined up
with the runway direction and the pilot normally only needs to level the wings
of the aircraft before landing. With the aircraft trimmed in a sideslip condition,
a steady-state side velocity is generated that can be adjusted to be equal and in
the opposite direction to the crosswind. Figure 5.39 illustrates the desired side
velocity for a crosswind situation.
Fig. 5.38 	Illustration of crabbing into the wind for a crosswind landing.
Fig. 5.39 	Side velocity generated for a crosswind situation.
226 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 242 of 650 --

The needed sideslip angle can be computed from the geometry presented in
Fig. 5.39.
b ¼ tan1 Vcrosswind
Vforward
 	
¼ sin1 Vcrosswind
V1
 	
ð5:112Þ
The control deflections necessary to achieve this trimmed sideslip condition
can be found using the lateral and directional Taylor series and assuming Cl0
and C n0 are zero.
C lb b þ C lda
da þ Cldr
dr ¼ 0 	ð5:113Þ
C nb b þ C nda
da þ Cndr
dr ¼ 0 	ð5:114Þ
These two equations lead to a fairly accurate 2-DOF solution of the cross-
wind problem. A more accurate 3-DOF solution would include the sideforce
equation, and bank angle would become one of the parameters. Because we
are using two equations, we can solve for two unknowns. The equations are
typically used in two ways. First, given a crosswind and landing speed (that is,
b can be computed from this information and thus is known), the control
deflections (da and dr) necessary to hold the needed sideslip angle can be
found.
Second, the crosswind limit of the aircraft can be found based on determin-
ing the limiting control deflection (generally the rudder, but not always). This
is a two-step process. Assume that the rudder is at maximum deflection, then
solve for b and da. Next, assume that the aileron is at maximum deflection,
then solve for b and dr. The lower value of b defines the max crosswind
condition and the maximum control deflection associated with it is the limiting
control deflection. For example, if an aircraft has a maximum aileron and
rudder deflection of 25 deg, Eqs. (5.113) and (5.114) should be solved simulta-
neously twice. The first solution fixes the rudder deflection at maximum, and
the second solution fixes the aileron deflection at maximum. Results for the
two cases might look like the following:
b ðdegÞ
5
15
dr
25
50
da
17
25
A da of 25 deg requires that dr be 50 deg to hold 15 deg of sideslip. Because
50 deg of rudder is not available, the first case with 25 deg of rudder and
17 deg of aileron (both within the capabilities of the aircraft) defines the maxi-
mum crosswind condition. Therefore, with a maximum sideslip angle of 5 deg,
the aircraft crosswind limit is
Vcrosswind ¼ V1 sin b 	ð5:115Þ
AIRCRAFT STATIC STABILITY 	227

-- 243 of 650 --

The rudder is the limiting control deflection.
Example 5.7
Using a 2-DOF solution, determine the crosswind limit of the T-37 assum-
ing a final approach equivalent airspeed of 100 kn and the following character-
istics:
C l0 ¼ 0 	Clb ¼ 0:11=deg Clda
¼ 0:178=deg 	Cldr
¼ 0:172=deg
C n0 ¼ 0 	C nb ¼ 0:127=deg Cnda
¼ 0:0172=deg C ndr
¼ 0:0747=deg
drmax ¼ 20 deg damax ¼ 15 deg
We first assume that the rudder is the limiting deflection and substitute
drmax ¼ 20 deg into Eqs. (5.113) and (5.114).
C lb b þ C lda
da þ Cldr
dr ¼ 0
 0:11b þ 0:178da þ ð0:172Þð20Þ ¼ 0
C nb b þ Cnda
da þ C ndr
dr ¼ 0
0:127b þ ð0:0172Þda  0:0747ð20Þ ¼ 0
Solving this two-equation=two-unknown problem yields
b ¼ 12:55 deg 	da ¼ 5:82 deg
Because the aileron deflection is within the maximum limits, a rudder deflec-
tion of 20 deg represents the limiting control for crosswinds, and a steady-state
sideslip angle of 12.55 deg is the maximum which the aircraft can hold. To
further illustrate this, we will assume that the aircraft is aileron limited and
rework the problem with damax ¼ 15 deg. Using the same approach, we have
C lb b þ C lda
da þ Cldr
dr ¼ 0
 0:11b þ 0:178ð15Þ þ ð0:172Þdr ¼ 0
C nb b þ C nda
da þ Cndr
dr ¼ 0
0:127b þ ð0:0172Þð15Þ  0:0747dr ¼ 0
and the solution is
b ¼ 32:33 deg 	dr ¼ 51:5 deg
A dr of 51.5 deg is not possible, of course, because of drmax being 20 deg.
Thus, our initial conclusion is correct—a rudder deflection of 20 deg represents
228 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 244 of 650 --

the limiting control for crosswinds, and a steady-state sideslip angle of
12.55 deg is the maximum that the aircraft can hold. We next use Eq. (5.115)
to determine the maximum crosswind under which the aircraft can maintain a
ground track parallel to the runway.
Vcrosswind ¼ V1 sin b ¼ 100 sin 12:55 deg ¼ 21:73 kn ðequivalent airspeedÞ
Of course, the maximum crosswind limit published in the flight manual will be
a little less than 21.73 kn to allow a margin of safety.
5.7 	Summary of Steady-State Force and Moment Derivatives
Table 5.1 summarizes the longitudinal and lateral-directional, steady-state,
force and moment derivatives discussed in this section. The signs for each deri-
vative are presented, but they should be used as a reference only and not
memorized. The reader should be able to define each derivative sign by apply-
ing the appropriate (positive) angle or control surface displacement, and then
determining the sign of the force or moment that results. A model airplane can
be useful in this exercise.
Table 5.1 	Steady-state force and moment derivatives
Derivative 	Sign
Longitudinal motion:
CL0 	> 0 (normally); can be < 0
CLa (aircraft lift curve slope) 	> 0
CLde	
> 0
CLih
> 0
CD0 	> 0
CDa 	> 0
CDde	
Depends on i h
CD ih
> 0 for ih > 0; < 0 for i h < 0
Cm0 	Can be either > 0 or < 0
Cma (longitudinal static stability) 	< 0 (for static stability)
Cmde
(longitudinal=elevator control power) 	< 0
Cm ih
< 0
Lateral-directional motion:
Cyb 	< 0
Cyda	
 0
Cydr	
> 0
Clb (lateral static stability) 	< 0 (for static stability)
Clda
(lateral or aileron control power) 	> 0
Cldr
(cross-control derivative) 	> 0
Cnb (directional static stability) 	> 0 (for static stability)
Cnda
(cross-control derivative) 	< 0 (adverse yaw); > 0 (proverse yaw)
Cndr
(directional or rudder control power) 	< 0
AIRCRAFT STATIC STABILITY 	229

-- 245 of 650 --

5.8 	Historical Snapshot—The X-38 Mid-Rudder Investigation
The U.S. Air Force Academy Department of Aeronautics, under sponsorship
from the NASA Johnson Space Center (JSC) Aerosciences and Flight
Mechanics Division, conducted wind tunnel research on the stability and
control of the X-38 Crew Return Vehicle (CRV) during the late 1990s and
early 2000s. 5 In particular, one effort focused on an alternate rudder design for
the X-38 that placed the rudders lower on the vertical stabilizer in a mid-
rudder configuration and increased the rudder area by 32%. The alternate
rudder design was investigated as an attempt to reduce the significant roll
coupling effect produced by the X-38 high-rudder design, which had the
rudders located at the top of the vertical stabilizers (see Fig. 5.40).
All tests were conducted in the Air Force Academy Subsonic Wind Tunnel
(see Fig. 1.59) with a 4.62% scale model of the X-38 as shown in Fig. 5.41.
Of particular interest were roll coupling (Cldr
) and rudder yaw control (Cndr
)
effects as discussed in Secs. 5.5.2.3 and 5.5.3.3. Figure 5.42 presents a graph
of roll coupling as a function of angle of attack and Mach number, which
shows that roll coupling decreased with increasing angles of attack.
Fig. 5.40 	X-38 mid-rudder and high-rudder geometry.
Fig. 5.41 	X-38 wind tunnel model.
230 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 246 of 650 --

When the roll coupling data were compared with that of the high-rudder
configuration, it was found that the mid-rudder configuration had approxi-
mately an equivalent roll coupling, C ldr
, compared to the high rudder. Figure
5.43 illustrates the comparison.
The reason for the similarity in the roll coupling between the high-rudder
and mid-rudder configurations was a result of several influences. Because the
increase in rudder area with the mid-rudder configuration exposed a larger
surface area to the freestream, there was an increase in side force. The lower
placement, on the other hand, produced a decrease in moment arm. These two
counteracting effects were a significant factor in keeping the roll coupling
nearly the same. In addition, flow separation effects near the mid-rudder also
contributed.
Figure 5.44 presents Cndr
as a function of angle of attack at 0.2 Mach.
Similar to C ldr
, Cndr
, decreased as angle of attack increased. In comparing the
Fig. 5.42 	X-38 roll coupling vs angle of attack at various Mach numbers.
Fig. 5.43 	Roll coupling comparison for mid- and high-rudder configurations.
AIRCRAFT STATIC STABILITY 	231

-- 247 of 650 --

directional control power of the mid-rudder configuration with high-rudder
configuration, it was found that the values of the mid-rudder data points were
more negative than those of the high-rudder configuration, signifying slightly
higher yaw control power. Figure 5.45 demonstrates this result.
The increase in overall yaw control power with the mid-rudder configuration
was primarily because of the increase in rudder area. However, the yaw control
power for the mid-rudder configuration increased by only 12% from the high
rudder, compared to a 32% increase in rudder area. This indicated a decrease
in effectiveness per unit area for the mid-rudder configuration. It was deter-
mined that the decreased effectiveness per unit area resulted from a flow
separation region near the mid-rudder.
After analyzing the differences between the mid-rudder and high-rudder
configuration, it was recommended that a smaller area mid-rudder design be
investigated to decrease roll coupling. Yaw control power was expected to also
decrease which would provide a value closer to the high-rudder yaw control
power. The program provided valuable inputs to the X-38 design team regard-
ing control design options.
Fig. 5.44 	Yaw control power as a function of angle of attack at M ¼ 0:2.
Fig. 5.45 	Yaw control power comparison for mid- and high-rudder configurations.
232 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 248 of 650 --

References
1 Murri, D. G., Grafton, S. B., and Hoffler, K. D., Wind Tunnel Investigation and Free-
Flight Evaluation of the F-15 STOL and Maneuver Technology Demonstrator, NASA TP
3003, Aug. 1990.
2 Olson, W. M., Wood, R. A., and Clarke, M. J., ‘‘YF-17 Performance and Flying
Qualities Evaluation,’’ AFFTC TR 75-18, June 1975.
3 Roskam, J., Airplane Design, Part VI, Design, Analysis, and Research Corporation,
Lawrence, KS, 1990.
4 Simon, J. M., LeMay, S., and Brandon, J. M., Results of Exploratory Wind Tunnel Tests
of F-16=VISTA Forebody Vortex Control Devices, WL-TR-93-3013, Jan. 1993.
5 Johnston, C. N., Nettleblad, T. A., and Yechout, T. R., ‘‘X-38 Mid-Rudder Feasibility
and Parafoil Cavity Investigations,’’ U.S. Air Force Academy Dept. of Aeronautics TR 01-
02, Sept. 2001.
Problems
5.1 	What are the two requirements for longitudinal static stability?
5.2 	Consider the following aircraft flying in straight and level unaccelerated
trimmed flight at M ¼ 0:2 at sea level.
(a) 	Find the lift of the wing and the lift of the tail. Assume Lwing and
Ltail act at the quarter chord points.
(b) 	Find the aircraft drag.
(c) 	Assuming a rectangular wing, what is the total aircraft C L?
(d) 	What is the pitching moment coefficient for the entire aircraft?
x cg ¼ 0:5cwing
M actail ¼ 0 	M acwing ¼ 5000 ft  lb
T ¼ 3000 lb 	W ¼ 12;000 lb
cwing ¼ 8 ft 	ctail ¼ 4 ft 	bwing ¼ 30 ft
AIRCRAFT STATIC STABILITY 	233

-- 249 of 650 --

5.3 	For the aircraft in Problem 5.2, with the additional information
ARw ¼ 7:65 	aOL W ¼ 2 deg 	e ¼ 1 	aOL t ¼ 0 deg
ARt ¼ 5 	S w ¼ 240 ft2 	S t ¼ 40 ft2
(a) 	What is the trimmed angle of attack of the tail?
(b) 	What is the trimmed angle of attack of the wing?
5.4 	Given the following information, find the lift of the wing and lift of the
tail. Also, determine the trimmed angle of attack of the wing and hori-
zontal tail. Assume that the lift of the wing and tail act at their respective
quarter chords.
ARwing ¼ 7:65 	aOLwing ¼ 2 deg 	e ¼ 1 	x cg ¼ 0:5c
ARtail ¼ 5:08 	aOLtail ¼ 0 	S w ¼ 240 ft2 	W ¼ 12;000 lb
Stail ¼ 20:32 ft2 	Mach ¼ 0:2 ð@ S:L:Þ 	M ACwing ¼ 5000 ft  lbf
l ¼ 17 ft 	c ¼ 8 ft
ðLw ¼ 11;000 lb; L t ¼ 1000 lb; at ¼ 10:56 deg; aw ¼ 6:90 degÞ
5.5 	Derive an expression for C mCL
in terms of static margin, noting
CmCL
¼ @C m
@CL
5.6 	The following questions all pertain to a single aircraft:
(a) 	When the c.g. is at 29% chord, and C mCL
¼ 0:10, what is the c.g.
position for Cm CL
¼ 0?
(b) 	If the c.g. is shifted to 26% chord, is the aircraft more or less
stable? What is the new value of C mCL
?
(c) 	With the c.g. at 26% chord, the Cm was found to be equal to 0.04
when C L ¼ 0 and de ¼ 0. What is the value of C L for trimmed
flight with de ¼ 0? [Hint: Use the value of C mCL
from Part (b).]
(d) 	If XXcg ¼ 0:26, CLmax ¼ 1:0, Cmde
¼ 0:01=deg, and demax ¼ 10 deg,
is it possible to attain CLmax in this aircraft? If so, solve for detrim at
CLmax . [Hint: Use Cm0 from Part (c).]
5.7 	Find the maneuver point. Use the following plot to determine dde=dn for
each c.g. location and the blank graph to estimate where dde=dn ¼ 0.
234 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 250 of 650 --

5.8 	(a) 	Define maneuver point in your own words.
(b) 	Where should the maneuver point be located relative to the neutral
point?
(c) 	What should the sign of C mq be to have a stabilizing effect? Why?
5.9 	Label the relative positions of the neutral and maneuver points:
5.10 Which of the following design features increases roll stability?
High Wing ðT-41Þ
Ventral Fin
Sweep Back
Geometric Dihedral
Dorsal Fin
Fuselage
AIRCRAFT STATIC STABILITY 	235

-- 251 of 650 --

5.11 The right engine on an aircraft with two 10,000 lb f thrust engines fails.
The aircraft is at sea level.
C nb ¼ 0:002=deg 	S ¼ 300 ft 2 	b ¼ 50 ft
Cndr
¼ 0:0033=deg 	q ¼ 100 lb=ft 2 	Ye ¼ 5 ft
(a) 	If the pilot takes no corrective action, what will the sideslip angle
(b) be?
(b) 	How many degrees and which direction should the pilot deflect the
rudder to realign the nose with the relative wind?
(c) 	If the max rudder deflection is 15 deg, at what airspeed would the
pilot no longer be able to maintain b ¼ 0 deg?
5.12 An aircraft has the following directional stability and control characteris-
tics:
C nb ¼ þ0:0035=deg 	C ndr
¼ 0:003=deg 	drmax ¼ 30 deg
(a) 	Determine the rudder deflection required to maintain a sideslip
angle of b ¼ 4 deg. Which rudder pedal would you push to get
b ¼ 4 deg?
(b) 	Given the following conditions: W
S landing
¼ 60 lb f
ft2 ; C Lmax ¼ 1:0
Assuming Vland and 1:2 Vstall , determine the maximum crosswind
component that can be handled by the rudder at sea level. We want to
land the aircraft with the longitudinal axis aligned with the runway.
5.13 The aircraft in Problem 5.12 has the following additional characteristics:
Cnb ¼ þ0:0035=deg 	Cndr
¼ 0:003=deg 	drmax ¼ 30 deg
Clb ¼ 0:0024=deg 	C ldr
¼ 0 	Clda
¼ 0:0008=deg
damax ¼  daleft þ daright
2 ¼ 30 deg
(a) 	If the landing speed is 1:2 Vstall and we keep the upwind wing low
(fuselage aligned with the runway), determine the max crosswind
component that can be handled by the ailerons.
(b) 	Determine the aileron deflection to maintain a sideslip of b ¼ 4 deg.
(c) 	Which control system, ailerons or rudder, will limit the crosswind
component for the aircraft?
236 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 252 of 650 --

5.14 A T-37 has the following stability derivative values during a no-flap final
approach at 100 kn equivalent airspeed:
Clb ¼ 0:11=deg 	Cldr
¼ þ0:0172=deg
C nb ¼ þ0:127=deg 	C lda
¼ þ0:178=deg
Cndr
¼ 0:0747=deg 	Cnda
¼ 0:0172=deg
Assume that the pilot lands with the fuselage aligned with the runway.
With drmax ¼ 20 deg and damax ¼ þ15 deg what is the maximum cross-
wind component allowable and which is the limiting control (aileron or
rudder)?
AIRCRAFT STATIC STABILITY 	237

-- 253 of 650 --

This page intentionally left blank

-- 254 of 650 --

6
Linearizing the Equations of Motion
The six aircraft equations of motion developed in Chapter 4 [see Eqs. (4.70)
and (4.71)] are nonlinear differential equations. They can be solved with a vari-
ety of numerical integration techniques to obtain time histories of motion vari-
ables, but it is nearly impossible to obtain closed solutions (equations for each
variable). Because valuable insight can be obtained from closed solutions
regarding the dynamic response of the aircraft, this chapter will use the small
perturbation approach to linearize the equations of motion and facilitate the
definition of closed solutions. In addition, the dynamic derivatives associated
with definition of applied forces and moments on the aircraft will be discussed.
6.1 	Small Perturbation Approach
Linearization of the aircraft equations of motion begins with consideration
of perturbed flight. Perturbed flight is defined relative to a steady-state
(trimmed) flight condition using a combination of steady-state and perturbed
variables for aircraft motion parameters and for forces and moments. Simply
stated, each motion variable, Euler angle, force, and moment in the equations
of motion (EOM) are redefined as the summation of a steady-state value
(designated with the subscript ‘‘1’’) and a perturbed value (designated with
lower case symbols) as summarized in Eq. (6.1).
U ¼ U1 þ u 	V ¼ V1 þ v 	W ¼ W1 þ w
P ¼ P1 þ p 	Q ¼ Q1 þ q 	R ¼ R1 þ r
C ¼ C1 þ c 	Y ¼ Y1 þ y 	F ¼ F1 þ f
FA ¼ FA1 þ fA 	FT ¼ FT1 þ fT
L A ¼ L A1 þ l A 	M A ¼ M A1 þ m A 	N A ¼ N A1 þ n A
LT ¼ L T1 þ lT 	M T ¼ M T1 þ m T 	N T ¼ NT1 þ n T
ð6:1Þ
For example, if an aircraft has a steady-state trimmed value for U of 400 ft=s
and then encounters turbulence which increases U to 402 ft=s, U at that instant
would be
U ¼ U1 þ u ¼ 400 þ 2
The ‘‘perturbed’’ x-axis velocity, u, would be 2 ft=s in this case. The assump-
tion of small perturbations (small values for u, v, w, p, etc.), allows lineariza-
tion of the aircraft EOM. The following four-step approach summarizes the
linearization technique:
239

-- 255 of 650 --

Step 1: Recast each variable in terms of a steady-state value and a
perturbed value (A ¼ A1 þ a). Assume small perturbations (a is small). Multi-
ply out and use trig identities.
Step 2: Apply the small-angle assumption to trig functions of perturbed
angles [cos y  1; sin y  y (in radians)]
Step 3: Assume products of small perturbations are negligible (ab  0).
Step 4: Remove the steady-state equation from the perturbed equation. The
remaining perturbed equation is a linearized differential equation with the
perturbed variables as the unknowns.
This approach is illustrated in Example 6.1.
Example 6.1
Linearize the following nonlinear differential equation.
_CC ¼ AB sin O
Step 1: A ¼ A1 þ a, B ¼ B1 þ b, C ¼ C1 þ c, O ¼ O1 þ o; substitute these
variables into the original equation and multiply out.
_CC1 þ _cc ¼ ðA1 þ aÞðB1 þ bÞ sinðO1 þ oÞ
_CC1 þ _cc ¼ ½A1B1 þ A1b þ aB1 þ ab sinðO1 þ oÞ
_CC1 þ _cc ¼ ½A1B1 þ A1b þ aB1 þ ab½sin O1 cos o þ cos O1 sin o
Step 2: cos o  1; sin o  o (in radians)
_CC1 þ _cc ¼ ½A1B1 þ A1b þ aB1 þ ab½sin O1 þ o cos O1
Step 3: ab  0
_CC1 þ _cc ¼ ½A1B1 þ A1b þ aB1½sin O1 þ o cos O1
and ao and bo  0;
_CC1 þ _cc ¼ A1B1 sin O1 þ A1b sin O1 þ aB1 sin O1 þ A1B1o cos O1
Step 4: The steady-state equation can be easily identified by going back to the
original differential equation and inserting subscripts of ‘‘1’’ on each variable.
_CC1 ¼ A1B1 sin O1
Subtracting the previous equation from the differential equation at the end of
Step 3, we have:
_cc ¼ A1b sin O1 þ aB1 sin O1 þ A1B1o cos O1
240 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 256 of 650 --

which is the linearized form of the differential equation in terms of the pertur-
bation variables a, b, c, and o.
6.2 	Developing the Linearized Aircraft Equations of Motion
The nonlinear longitudinal EOM presented in Eq. (4.70) can be rewritten as
mð _U	U þ QW  RV Þ ¼ mg sin Y þ FAx þ F T x
_Q	QI yy  PRðI zz  I xxÞ þ ðP2  R2ÞI xz ¼ M A þ M T 	ð6:2Þ
mð _W	W þ PV  QU Þ ¼ mg cos F cos Y þ F Az þ F T z
where FA x and FA z are the aero forces acting along the respective x and z axis
directions. Likewise, FT x and F T z represent the thrust forces acting along their
respective directions. Notice also that the Euler angles have been designated
with capital letters to conform with the approach defined by Eq. (6.1).
Fig. 6.1 	Illustration of body-fixed stability axis.
LINEARIZING THE EQUATIONS OF MOTION 	241

-- 257 of 650 --

The nonlinear lateral-directional equations of motion presented in Eq. (4.71)
are presented again here for convenient reference.
_PPI xx þ QRðI zz  I yyÞ  ð _RR þ PQÞI xz ¼ L A þ LT
mð _VV þ RU  PW Þ ¼ mg sin F cos Y þ FA y þ FT y 	ð6:3Þ
_RRI zz þ PQðI yy  I xxÞ þ ðQR  _PPÞI xz ¼ N A þ NT
As discussed in Sec. 5.3, we will use a body-fixed stability axis system where
the x-stability axis is oriented directly with the steady-state relative wind. Thus,
U1 will be equal to Vtrim while V1 and W1 are equal to zero. This approach
simplifies representation of the aero forces and moments. However, the reader
is reminded that, to be perfectly correct, the moments and products of inertia
in Eqs. (6.2) and (6.3) must be defined relative to this body-fixed stability axis.
Figure 6.1 illustrates the body-fixed stability axis.
6.2.1 	Longitudinal Linearized EOMs
To linearize the nonlinear longitudinal EOM of Eq. (6.2), the small pertur-
bation approach discussed in Sec. 6.1 will be used. The substitutions of Eq.
(6.1) are made in Eq. (6.2) to yield
m½ _U	U1 þ _uu þ ðQ1 þ qÞðW1 þ wÞ  ðR1 þ rÞðV1 þ vÞ
¼ mg sinðY1 þ yÞ þ F Ax1
þ fA x þ FT x1
þ f T x
Iyyð _Q	Q1 þ _qqÞ  ðP1 þ pÞðR1 þ rÞðI zz  IxxÞ þ ½ðP1 þ pÞ2  ðR1 þ rÞ2I xz
¼ M A1 þ m A þ M T1 þ m T
m½ _W	W1 þ _ww þ ðP1 þ pÞðV1 þ vÞ  ðQ1 þ qÞðU1 þ uÞ
¼ mg cosðF1 þ fÞ cosðY1 þ yÞ þ FAz1
þ f A z þ FT z1
þ f T z
Applying Steps 2–4 of Sec. 6.1, these reduce to
mð_uu  V1r  R1v þ W1q þ Q1wÞ ¼ mgy cos Y1 þ f Ax þ f T x
I yy _qq þ ðI xx  I zzÞðP1r þ R1pÞ þ I xzð2P1p  2R1rÞ ¼ m A þ mT
mð _ww  U1q  Q1u þ V1p þ P1vÞ ¼ mgy cos F1 sin Y1
 mgf sin F1 cos Y1 þ f Az þ f T z
ð6:4Þ
Equation (6.4) represents the linearized longitudinal EOM as a function of the
variables u, v, w, p, q, r, y and f.
242 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 258 of 650 --

6.2.2 	Lateral-Directional Linearized EOMs
Linearization of the nonlinear lateral-directional EOM presented in Eq. (6.3)
also use the small perturbation approach of Sec. 6.1. The small perturbation
substitutions result in:
ð _PP1 þ _ppÞI xx þ ðQ1 þ qÞðR1 þ rÞðI zz  I yyÞ  ½ _RR1 þ _rr þ ðP1 þ pÞðQ1 þ qÞI xz
¼ LA þ l A þ LT þ l T
m½ _VV1 þ v þ ðR1 þ rÞðU1 þ uÞ  ðP1 þ pÞðW1 þ wÞ
¼ mg sinðF1 þ fÞ cosðY1 þ yÞ þ FAy1
þ f Ay þ FT y1
þ f T y
ð _RR1 þ rÞI zz þ ðP1 þ pÞðQ1 þ qÞðIyy  I xxÞ þ ½ðQ1 þ qÞðR1 þ rÞ  ð _PP1 þ _ppÞIxz
¼ NA1 þ n A þ NT1 þ n T
Applying Steps 2–4 of Sec. 6.1, these reduce to
I xx _pp  I xz _rr  IxzðP1q þ Q1pÞ þ ðI zz  IyyÞðR1q þ Q1rÞ ¼ l A þ l T
mð_vv þ U1r þ R1u  W1p  P1wÞ ¼ mgy sin F1 sin Y1
þ mgf cos F1 cos Y1 þ fA y þ fT y
I zz _rr  I xz _pp þ ðI yy  I xxÞðP1q þ Q1pÞ þ I xzðQ1r þ R1qÞ ¼ n A þ n T
ð6:5Þ
Equation (6.5) represents the linearized lateral-directional EOM as a function
of the variables u, v, w, p, q, r, y and f, the same variables in the linearized
longitudinal EOM. We thus have a situation with six equations and eight
unknowns. The kinematic equations [Eq. (4.80)] may be linearized using a
similar approach 1 to yield three additional equations and one additional
unknown (c)—a solvable nine-equation=nine-unknown problem for the per-
turbed aircraft EOM.
6.2.3 	Simplifying the Linearized EOMs for Wings Level, Straight
Flight
Equations (6.4) and (6.5) may be simplified with the assumption of wings
level, straight line flight for the initial trim, or steady state, condition. With this
constraint,
F1 ¼ P1 ¼ Q1 ¼ R1 ¼ b ¼ 0
In addition, our choice of the body-fixed stability axis, as discussed in Sec.
6.2, leads to the additional simplification of:
V1 ¼ W1 ¼ 0
LINEARIZING THE EQUATIONS OF MOTION 	243

-- 259 of 650 --

With these assumptions, the linearized longitudinal EOM of Eq. (6.4) become
m_uu ¼ mgy cos Y1 þ f A x þ f T x
I yy _qq ¼ m A þ mT 	ð6:6Þ
mð _ww  U1qÞ ¼ mgy sin Y1 þ fA z þ f T z
and the linearized lateral-directional EOM of Eq. (6.5) become
I xx _pp  I xz _rr ¼ l A þ l T
mð_vv þ U1rÞ ¼ mgf cos Y1 þ f Ay þ f T y 	ð6:7Þ
I zz _rr  Ixz _pp ¼ n A þ n T
At this point, it is reasonable to ask if the restrictive assumptions of wings-
level, straight flight will restrict our study of aircraft dynamic stability charac-
teristics. Fortunately, the answer is no, because the fundamental dynamic
modes of the aircraft are still present with these assumptions and dynamic
stability characteristics observed about a wings-level, straight-line, trimmed
flight condition are representative of those experienced during maneuvering
flight. In short, these assumptions and choice of the body-fixed stability axis
system have allowed simplification of the EOM to a manageable form so that
understanding of dynamic stability concepts can be maximized.
6.3 	First-Order Approximation of Applied Aero Forces and
Moments
We will now focus on the applied aerodynamic force and moment terms
(include fA x and mA) in Eqs. (6.6) and (6.7). These represent the perturbed
change in an aerodynamic force or moment that results from a nonzero value
of a perturbed motion variable like u. We begin with the observation that the
longitudinal perturbed forces and moment are a function primarily of five para-
meters:
fA x ; m A; f Az ¼ f ðu; ^aa; _aa; q; ^ddeÞ 	ð6:8Þ
As a reminder, the parameters u, ^aa, _aa, q, and ^dde are perturbation variables. ^aa,
_aa, and ^dde deserve explanation because we have not discussed them before. The
angle of attack is defined using the perturbation variable ^aa with the same
approach as in Eq. (6.1).
a ¼ a1 þ ^aa
_aa could be thought about in the same manner:
_aa ¼ _aa1 þ _^aa^aa
244 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 260 of 650 --

Because _aa1 is equal to zero (the derivative of a constant), we have _aa ¼ _^aa^aa, and
we will dispense with the hat for simplicity. The perturbed elevator deflection,
^dde, is defined in a similar manner as used with Eq. (6.1):
de ¼ de1 þ ^dde
Recall that the subscript ‘‘1’’ indicates the steady-state or trimmed value of the
parameter.
We will use a first-order Taylor series to approximate how the longitudinal
perturbed forces and moment vary as a function of the five perturbed variables
presented in Eq. (6.8).
f Ax ¼ @F Ax
@u u þ @F Ax
@^aa ^aa þ @F Ax
@_aa _aa þ @F Ax
@q q þ @F Ax
@^dde
^dde
m A ¼ @M A
@u u þ @MA
@^aa ^aa þ @M A
@_aa _aa þ @M A
@q q þ @M A
@^dde
^dde 	ð6:9Þ
fA z ¼ @F Az
@u u þ @FA z
@^aa ^aa þ @FA z
@_aa _aa þ @F Az
@q q þ @FA z
@^dde
^dde
Next, we will use the same approach to define the perturbed lateral-direc-
tional force and moments. We begin with the observation that six parameters
primarily influence the lateral-directional perturbed force and moments:
l A; f Ay ; n A ¼ f ð ^bb; _bb; p; r; ^dda; ^ddrÞ 	ð6:10Þ
Again, ^bb, _bb, p, r, ^dda, and ^ddr are perturbation variables. The perturbed sideslip,
^bb, is defined using the same approach as in Eq. (6.1).
b ¼ b1 þ ^bb
For wings-level, trimmed, straight-line flight, b1 equals zero and we have
b ¼ ^bb. We will dispense, at this point, with the hat for simplicity. _bb should be
considered in the same manner.
_bb ¼ _bb1 þ _^bb^bb
LINEARIZING THE EQUATIONS OF MOTION 	245

-- 261 of 650 --

Because _bb1 is equal to zero (the derivative of a constant), we have _bb ¼ _^bb^bb, and
we will again dispense with the hat. The perturbed aileron and rudder deflec-
tions, ^dda and ^ddr, are also defined as perturbations to the steady-state value:
da ¼ da1 þ ^dda
dr ¼ dr1 þ ^ddr
We will again use a first-order Taylor series to approximate how the lateral-
directional perturbed force and moments vary as a function of the six perturbed
variables presented in Eq. (6.10).
l A ¼ @LA
@b b þ @LA
@ _bb
_bb þ @L A
@p p þ @LA
@r r þ @LA
@^dda
^dda þ @L A
@^ddr
^ddr
fA y ¼ @F Ay
@b b þ @F Ay
@ _bb
_bb þ @F Ay
@p p þ @F Ay
@r r þ @FAy
@^dda
^dda þ @FA y
@^ddr
^ddr 	ð6:11Þ
nA ¼ @N A
@b b þ @NA
@ _bb
_bb þ @NA
@p p þ @N A
@r r þ @N A
@^dda
^dda þ @N A
@^ddr
^ddr
The Taylor series representation of Eqs. (6.9) and (6.11) makes the quasi-
steady assumption that the perturbed forces and moment are only a function of
the instantaneous values of the perturbed motion variables. For the majority of
rigid airplane dynamic stability analysis (at frequencies below 10 rad=s), this
assumption provides accurate results.
6.3.1 	Nondimensionalizing the First-Order Approximations
At this point, it is customary to nondimensionalize the perturbed variables
in Eqs. (6.9) and (6.11). This is typically done to facilitate comparisons. It
is accomplished in a straightforward manner. First, all angles (a, ^dde, b, ^dda, and
^ddr) are represented in radians, which are dimensionless. Second, the perturbed
x-axis velocity u is divided by the steady-state velocity U1 to yield u=U1,
which is a dimensionless ratio. Third, the perturbed longitudinal angular rates
(_aa and q) are multiplied by cc=2U1 to yield _aacc=2U1 and qcc=2U1 , both nondi-
mensional ratios when _aa and q have units of radians=second. Fourth, the
perturbed lateral-directional angular rates ( _bb, p, and r) are multiplied by b=2U1
to form _bbb=2U1 , pb=2U1 , and rb=2U1 . Again, _bb, p, and r must have units of
radians=second to make the ratios dimensionless. This is the conventional
approach to nondimensionalizing the perturbation variables. The ‘‘2’’ in the
denominator of the nondimensional angular rate terms comes from the roll
helix angle (the angle that a wing tip makes with the forward velocity vector
during a rolling maneuver). It is maintained in the other angular rate terms for
246 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 262 of 650 --

consistency. With the nondimensional perturbation variables incorporated, Eqs.
(6.9) and (6.11) become
fA x ¼ @FA x
@ u
U1
u
U1
 	
þ @FAx
@^aa ^aa þ @F Ax
@ _aacc
2U1
_aacc
2U1
 	
þ @F Ax
@ qcc
2U1
qcc
2U1
 	
þ @F Ax
@^dde
^dde
mA ¼ @M A
@ u
U1
u
U1
 	
þ @M A
@^aa ^aa þ @M A
@ _aacc
2U1
_aacc
2U1
 	
þ @M A
@ qcc
2U1
qcc
2U1
 	
þ @M A
@^dde
^dde 	ð6:12Þ
f Az ¼ @FA z
@ u
U1
u
U1
 	
þ @FA z
@^aa ^aa þ @F Az
@ _aacc
2U1
_aacc
2U1
 	
þ @F Az
@ qcc
2U1
qcc
2U1
 	
þ @F Az
@^dde
^dde
l A ¼ @LA
@b b þ @LA
@ _bbb
2U1
_bbb
2U1
!
þ @L A
@ pb
2U1
pb
2U1
 	
þ @L A
@ rb
2U1
rb
2U1
 	
þ @LA
@da
^dda þ @LA
@dr
^ddr
f Ay ¼ @FAy
@b b þ @F Ay
@ _bbb
2U1
_bbb
2U1
!
þ @FA y
@ pb
2U1
pb
2U1
 	
þ @FA y
@ rb
2U1
rb
2U1
 	
þ @FA y
@da
^dda þ @F Ay
@dr
^ddr 	ð6:13Þ
nA ¼ @NA
@b b þ @N A
@ _bbb
2U1
_bbb
2U1
!
þ @NA
@ pb
2U1
pb
2U1
 	
þ @NA
@ rb
2U1
rb
2U1
 	
þ @NA
@da
^dda þ @NA
@dr
^ddr
Equation (6.12) is the nondimensionalized, longitudinal equation for per-
turbed forces and moment, and Eq. (6.13) is the nondimensionalized, lateral-
directional, perturbed force and moments equation.
6.3.2 	Longitudinal Perturbed Force and Moment Derivatives
We will next analyze each of the partial derivative terms in Eq. (6.12) so
that they may be expressed with common longitudinal aerodynamic coefficients
such as CL, C D, and Cm. To do this, we will analyze a perturbation in angle of
attack (^aa) about the body-fixed stability axis. Figure 6.2 presents the axis
systems associated with an exaggerated ^aa perturbation. Notice that the instanta-
neous velocity, V1, defines the direction of the lift and drag coefficients (C L
LINEARIZING THE EQUATIONS OF MOTION 	247

-- 263 of 650 --

and C D). The coefficients Cx and C z are defined relative to the body-fixed
stability axis, which has its x axis aligned with Vtrim .
6.3.2.1 u=U1 derivatives. 	The u=U1 derivatives consist of @F Ax =@ðu=U1Þ,
@M A=@ðu=U1Þ, and @F Az =@ðu=U1Þ in Eq. (6.12). We will begin with @F Ax =@ðu=U1Þ.
FA x is defined along Xstability , the body-fixed stability x axis. Figure 6.3 presents
the vectors associated with the analysis. Notice that the vectors U1 and V1 are
now shown relative to fixed space.
FA x may be defined in terms of the coefficient C x, which is shorthand for
C F Ax
; as
FA x ¼ C x qqS
We then have
@FA x
@ u
U1
¼ @ðCx qqSÞ
@ u
U1
1
where the j1 indicates that the partial derivative must be evaluated at the
steady-state condition where the perturbation variables such as ^aa and u are
zero. We must do this because the partial derivatives in the Taylor series
expansions of Eqs. (6.12) and (6.13) are simply slopes used for a linear projec-
Fig. 6.2 	Axis systems associated with an angle of attack perturbation.
248 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 264 of 650 --

tion of perturbation values about the steady-state trimmed condition. Because
both C x and qq may vary with u, we take the derivative in two parts:
@FA x
@ u
U1
¼ @ðCx qqSÞ
@ u
U1
1
¼ @C x
@ u
U1
qqS 1
|fflfflfflfflffl{zfflfflfflfflffl}
A
þ C x S @qq
@ u
U1
1
|fflfflfflfflfflfflffl{zfflfflfflfflfflfflffl}
B
ð6:14Þ
We will address part A of Eq. (6.14) first.
From Fig. 6.4, we have
Cx ¼ CD cos ^aa þ C L sin ^aa
and with the small perturbation assumption, this becomes
Cx  CD þ CL ^aa 	ð6:15Þ
Using Eq. (6.15),
@C x
@ u
U1
  @CD
@ u
U1
1
þ @C L
@ u
U1
^aa 1
ð6:16Þ
Fig. 6.3 	Illustration of a u perturbation.
LINEARIZING THE EQUATIONS OF MOTION 	249

-- 265 of 650 --

Evaluating Eq. (6.16) at the steady-state condition, ^aa ¼ 0, and, for part A we
have
@C x
@ u
U1
  @C D
@ u
U1
¼ CD u 	ð6:17Þ
CD u is called the speed damping derivative. It represents the change in drag
coefficient with respect to u=U1 and its value is dependent on Mach number.
The value of CD u is generally zero or very small for pretransonic, subsonic
Mach numbers. In the subsonic, transonic regime approaching Mach 1, C D u is
generally positive indicating the significant drag rise as sonic flight is
approached. Above Mach 1, CD u is generally negative.
Returning to Eq. (6.14), we now look at part B.
@qq
@ u
U1
¼ U1
@qq
@u ¼ U1
@½1
2 rfðU1 þ uÞ2 þ v2 þ w2g
@u 	1
¼ U1
1
2
 
rð2fU1 þ ugÞj1
Evaluation at the steady state condition were u ¼ 0 yields
@qq
@ u
U1
¼ rU 2
1 ¼ 2qq1 	ð6:18Þ
Fig. 6.4 	Illustration of resolution of lift and drag coefficient.
250 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 266 of 650 --

where qq1 is the steady-state dynamic pressure. We now are able to incorporate
Eqs. (6.17) and (6.18) into Eq. (6.14).
@FAx
@ u
U1
¼ CD u qqSj1 þ Cx Sð2qq1Þj1
When evaluated at the steady-state condition, Cx ¼ CD1 and qq ¼ qq1 . These
substitutions result in
@F Ax
@ u
U1
¼ ðCD u þ 2C D1 Þqq1S 	ð6:19Þ
The beauty of Eq. (6.19) is that the derivative is now expressed in terms of
aerodynamic characteristics such as CD u and C D1 , which can be estimated
analytically, determined from wind tunnel testing, or computed with computa-
tional fluid dynamics (CFD) techniques.
The next u=U1 derivative to be considered is @M A=@ðu=U1Þ. Because
M A ¼ C m qqS cc and both Cm and qq may vary with u, we have
@M A
@ u
U1
¼ @Cm
@ u
U1
 	 qqS cc
1
þ Cm S cc @qq
@ u
U1
 	
1
ð6:20Þ
We will define
@C m
@ u
U1
 	 ¼ Cm u 	ð6:21Þ
Note again that the subscript u in Cm u really implies partial differentiation of
C m with respect to ‘‘u=U1 ’’. With the substitutions of Eqs. (6.18) and (6.21),
along with evaluation at the steady-state condition, Eq. (6.20) becomes
@M A
@ u
U1
¼ C mu qq1S cc þ C m1 S ccð2qq1Þ
and, in combined form
@M A
@ u
U1
¼ ðC mu þ 2Cm1 Þqq1S cc 	ð6:22Þ
The derivative Cm u results from changes in C m0 and the aerodynamic center
location with changes with forward speed. Probably the most notable effect on
LINEARIZING THE EQUATIONS OF MOTION 	251

-- 267 of 650 --

Cm u is the aft shift in aerodynamic center that occurs in the subsonic, transonic
speed range. As the aerodynamic center moves aft, a negative pitching moment
results that typically results in a negative Cm u . Thus, in this range, the aircraft
tends to experience a nose-down pitching moment with increasing speed. This
phenomena is commonly referred to as ‘‘Mach Tuck,’’ a characteristic that
caused the crash of several high-speed subsonic aircraft that were not able to
pull out of steep dives as the speed increased and C mu became more negative.
As a result, Cm u is commonly called the Mach tuck derivative. C m1 is the
steady-state aerodynamic pitching moment. It will be nonzero for cases where
a thrust pitching moment must be counteracted by an aerodynamic pitching
moment to trim the aircraft to a total pitch moment of zero. For all other cases
such as gliders and power-off flight, Cm1 will be equal to zero.
The last u=U1 derivative is @F Az =@ðu=U1Þ. We begin by referring to Fig. 6.2
and defining
FAz ¼ C z qqS
Using the same approach as with Eq. (6.14), we have
@FA z
@ u
U1
¼ @ðC z qqSÞ
@ u
U1 	1
¼ @C z
@ u
U1
qqS
1
þ C z S @qq
@ u
U1 	1
where (referring to Fig. 6.4)
C z ¼ CL cos ^aa  C D sin ^aa
With the assumption of small perturbations, this becomes
Cz  CL  CD ^aa 	ð6:23Þ
and
@Cz
@ u
U1
  @C L
@ u
U1 	1
 @C L
@ u
U1
^aa
1
ð6:24Þ
Evaluating Eq. (6.24) at the steady-state condition, ^aa ¼ 0, we have
@Cz
@ u
U1
  @CL
@ u
U1
¼ CL u 	ð6:25Þ
CL u represents the change in lift coefficient with respect to velocity. The
@qq=@ðu=U1Þ derivative in Eq. (6.23) follows the same development as found
252 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 268 of 650 --

with Eq. (6.18), @qq=@ðu=U1Þ ¼ 2qq1 . Incorporating Eqs. (6.18) and (6.25) into
the original expression for @F Az =@ðu=U1Þ and realizing that C z ¼ CL1 at steady
state, we have
@F Az
@ u
U1
¼ ðC L u þ 2CL1 Þqq1S 	ð6:26Þ
Example 6.2
Find the u=U1 derivative @FA x =@ðu=U1Þ for the F-4C aircraft at 35,000 ft and
Mach 0.9 (U1 ¼ 876 ft=s, qq ¼ 283:2 lb=ft 2 , S ¼ 530 ft 2 ) if CD1 ¼ 0:03 and
CD u ¼ 0:027. If U is perturbed to 880 ft=s, find the perturbed applied aero
force along the x stability axis ( f A x ).
Starting with Eq. (6.19),
@FA x
@ u
U1
¼ ðCD u þ 2CD1 Þqq1S ¼ ð0:027 þ 2½0:03Þ283:2ð530Þ
@FA x
@ u
U1
¼ 13;058:4 lb
To find f Ax, we first find the perturbed velocity u.
u ¼ U  U1 ¼ 880  876 ¼ 4 ft=s
and, from Eq. (6.12) for only a u perturbation
fA x ¼ @FA x
@ u
U1
u
U1
 	
¼ 13;058:4 4
876
 	
¼ 59:6 lb
Because f Ax is positive along the positive x stability axis, we have predicted a
59.6-lb increase in the drag of the aircraft if the velocity perturbs by 4 ft=s.
6.3.2.2 ^aa derivatives. 	The ^aa, or perturbed angle of attack derivatives,
consist of @FA x =@^aa, @M A=@^aa, and @FA z =@^aa in Eq. (6.12). We begin with @F Ax =@^aa
and Eq. (6.15) for C x.
@F Ax
@^aa ¼ @Cx
@^aa qqS
LINEARIZING THE EQUATIONS OF MOTION 	253

-- 269 of 650 --

and
@Cx
@^aa ¼  @C D
@^aa þ @CL
@^aa ^aa þ C L 	ð6:27Þ
Evaluating Eq. (6.27) at the steady-state flight condition (^aa ¼ 0),
@C x
@^aa ¼ CD^aa þ CL1
and
@FAx
@^aa ¼ ðC D^aa þ CL1 Þqq1S 	ð6:28Þ
CD^aa is the same as the C Da discussed in Sec. 5.3.1 and Eq. (5.16). It is basi-
cally the slope of the C D vs a plot at the trim condition, a1 (see Fig. 5.4).
The next ^aa derivative to be considered is @M A=@^aa. This becomes
@M A
@^aa ¼ @Cm
@^aa qqS cc 1
¼ Cm^aa qq1S cc 	ð6:29Þ
Cm^aa is the same as the C ma discussed in Sec. 5.3.3.1 and Eq. (5.43). It is the
longitudinal static stability derivative, which must be negative in value for
longitudinal static stability.
The last ^aa derivative is @FAz =@^aa. We begin by referring to Fig. 6.4 and Eq.
(6.23).
@FA z
@^aa ¼ @Cz
@^aa qqS ¼ 	 @C L
@^aa  @CD
@^aa ^aa  CD
 	
qqS 1
ð6:30Þ
Evaluating Eq. (6.30) at the steady state flight condition, ^aa ¼ 0, we have
@FA z
@^aa ¼ ðCL^aa þ CD1 Þqq1S 	ð6:31Þ
CL^aa is the same as the CLa discussed in Sec. 5.3.2 and Eq. (5.30). It is
commonly referred to as the lift curve slope.
Example 6.3
Find the ^aa derivative @FAz =@^aa for the F-4C aircraft at the same flight condi-
tions as those of Example 6.2. C La is equal to 3.75=rad. If the F-4C is trimmed
at an angle of attack of 2.6 deg and then is perturbed to 3.1 deg, find the
perturbed aero force along the z stability axis ( fA z ).
254 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 270 of 650 --

Starting with Eq. (6.31),
@FAz
@^aa ¼ ðCL^aa þ CD1 Þqq1S ¼ ð3:75 þ 0:03Þð283:2Þð530Þ
@FAz
@^aa ¼ 567;363 lb=rad
To find f Az, we first find the perturbed angle of attack ^aa
^aa ¼ a  a1 ¼ 3:1 deg  2:6 deg ¼ 0:5 deg ¼ 0:00873 rad
and from Eq. (6.12) for only an ^aa perturbation
fA z ¼ @F Az
@^aa ^aa ¼ 567;363ð0:00873Þ ¼ 4951 lb
Because f Az is positive along the positive z stability axis, we have predicted a
4951 lb increase in the lift of the aircraft if the angle of attack perturbs by one-
half degree. This may seem very large, but remember the aircraft is at Mach
0.9.
6.3.2.3 Quasi-steady _aacc=2U1 derivatives. 	If a rate of change in angle of
attack (_aa) is present, a lag in the development of downwash at the horizontal tail
occurs. Because the a derivatives assume that the downwash is fully developed,
the ‘‘_aacc=2U1 ’’ derivatives provide a correction to the a derivatives when the
aircraft is undergoing a rate of change in angle of attack.
The first 	_aacc=2U1 derivative in Eq. (6.12) to be considered is @FA x =
@ð_aacc=2U1Þ. Using a similar approach to the u=U1 and a derivatives, we have
@FA x
@ _aacc
2U1
¼ @ðC x qqSÞ
@ _aacc
2U1
¼ C x_aa qqS ¼ C D_aa qq1S 	ð6:32Þ
The derivative C D_aa represents the change in drag coefficient with respect to
nondimensional _aa. For most applications, the lag in downwash because of _aa
has little effect on the drag coefficient, therefore, it is typically assumed that
CD_aa ¼ 0.
The next _aacc=2U1 derivative that we will consider is @F Az =@ð_aacc=2U1Þ. Again,
we have
@FA z
@ _aacc
2U1
¼ @ðCz qqSÞ
@ _aacc
2U1
¼ Cz_aa qqS ¼ C L_aa qq1S 	ð6:33Þ
The derivative CL_aa is significant, and we will develop an approach to estimate
it. Remember that CL_aa should be considered a correction to C La for nonsteady-
LINEARIZING THE EQUATIONS OF MOTION 	255

-- 271 of 650 --

state conditions. Figure 6.5 presents an aircraft experiencing an _aa as it transi-
tions from ainitial to afinal . If this change in a takes place in Dt seconds, we
have
_aa ¼ afinal  ainitial
Dt
This figure also shows the change in downwash angle that occurs at the hori-
zontal tail. The change in downwash angle will be defined as
De ¼ einitial  efinal
De can also be viewed as the correction needed to the steady-state downwash
angle to compensate for the downwash lag. It can also be estimated with
De ¼  de
da
da
dt Dt ¼  de
da _aaDt 	ð6:34Þ
de=da is the rate of change of downwash angle with angle of attack as
discussed in Sec. 5.3.2. Dt is the time it takes for the final downwash to travel
back to the horizontal tail. Referring to Fig. 6.5, Dt is normally estimated as
Dt ¼ Xh
U1
¼ x ACh  x cg
U1
ð6:35Þ
Thus, Eq. (6.34) becomes
De ¼  de
da _aa Xh
U1
ð6:36Þ
Because the estimate of the lift coefficient at the horizontal tail is based on the
steady-state angle of attack (by using CLa ), we next estimate the correction
(DC L h ) needed to the lift coefficient because of the lag in downwash (resulting
from _aa). This becomes
DC L h ¼ CLah
ðDeÞ ¼ ðCLah
Þ de
da _aa Xh
U1
ð6:37Þ
The correction to lift coefficient is positive because the steady-state lift coeffi-
cient assumes a fully developed downwash angle that reduces the lift. Down-
wash lag results in the original downwash angle being maintained, resulting in
additional lift over that predicted for the steady-state angle of attack during this
interim period. We next use the techniques of Sec. 5.3.2 and Eq. (6.37) to
predict the increase in lift coefficient for the entire aircraft.
DCL ¼ DCL h Zh
S h
S ¼ ðCLah
Þ de
da _aa Xh
U1
Zh
S h
S ð6:38Þ
256 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 272 of 650 --

Fig. 6.5
 
Illustration of downwash lag.
LINEARIZING THE EQUATIONS OF MOTION 	257

-- 273 of 650 --

Recalling from Eq. (6.33) that we wanted to develop an expression for CL_aa , we
have
C L_aa ¼ @CL
@ _aacc
2U1
¼ 2U1
cc
@CL
@_aa ð6:39Þ
Finally, we can take the partial derivative of Eq. (6.38) with respect to _aa and
substitute the result into Eq. (6.39)
CL_aa ¼ 2U1
cc ðC Lah
Þ de
da
X h
U1
Zh
S h
S ð6:40Þ
Recalling from Eq. (5.44) that the tail volume ratio, VVh, is equal to Xh
cc
S h
S , Eq.
(6.40) becomes
CL_aa ¼ 2ðC Lah
Þ de
da Zh VVh 	ð6:41Þ
The last _aacc=2U1 derivative to be considered is @M A=@ð_aacc=2U1Þ. Again, we
have
@M A
@ _aacc
2U1
¼ @C m qqS cc
@ _aacc
2U1
¼ Cm_aa qq1S cc 	ð6:42Þ
Cm_aa results from the same downwash lag phenomena that was analyzed to
obtain the estimate of CL_aa . Thus, Eq. (6.41) is multiplied by the nondimen-
sional moment arm Xh=cc along with a negative sign indicating that positive lift
on the horizontal tail produces a nose-down (negative) pitching moment to
obtain Cm_aa .
Cm_aa ¼ 2ðC Lah
Þ de
da Zh VVh
Xh
cc ð6:43Þ
As a rule of thumb, for many airplanes Cm_aa is approximately equal to one
third the value of C m q [Eq. (6.49)].
Example 6.4
Find the _aacc=2U1 derivative @M A=@ð_aacc=2U1Þ for the F-4C at the same condi-
tions as presented in Example 6.2. cc for the F-4C is 16 ft and Cm_aa is 1.3 per
rad. If _aa is 0.5 deg=s, find the perturbed pitching moment m A.
Starting with Eq. (6.42),
@MA
@ _aacc
2U1
¼ Cm_aa qq1S cc ¼ 1:3ð283:2Þ530ð16Þ ¼ 3;121;997 ft  lb=rad
258 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 274 of 650 --

To find mA, we use Eq. (6.12) for only an _aa perturbation
mA ¼ @M A
@ _aacc
2U1
_aacc
2U1
 	
¼ 3;121;997 ð0:5=57:3Þð16Þ
2ð876Þ
 	
¼ 248:8 ft  lb
Notice that degrees=second are converted to radians=second to maintain consis-
tent units. We have predicted a nose-down pitching moment of 248.8 ft=lb
resulting from a positive 0.5 deg=s _aa.
6.3.2.4 Pitch rate qcc=2U1 derivatives. 	The qcc=2U1 derivatives consist of
@FA x =@ðqcc=2U1Þ, @M A=@ðqcc=2U1Þ and @F Az =@ðqcc=2U1Þ in Eq. (6.12). We begin
with @F Ax =@ðqcc=2U1Þ.
@FA x
@ qcc
2U1
¼ @ðC x qqSÞ
@ qcc
2U1
¼ C x q qqS ¼ C Dq qq1S 	ð6:44Þ
The derivative C Dq represents the change in drag coefficient with respect to
nondimensional pitch rate. For most applications, this derivative is very small
and assumed to be equal to zero (CD q  0).
The next ‘‘qcc=2U1 ’’ derivative to be considered is @FAz =@ðqcc=2U1Þ.
@FA z
@ qcc
2U1
¼ @ðCz qqSÞ
@ qcc
2U1
¼ Cz q qqS ¼ C L q qq1S 	ð6:45Þ
CL q should be thought of as the change in lift coefficient because of pitch rate.
Referring to Fig. 6.6, it can be seen that a positive pitch rate, q, results in a
downward velocity, qXh, at the horizontal tail.
Fig. 6.6 	Illustration of change in angle of attack at the horizontal tail because of
pitch rate.
LINEARIZING THE EQUATIONS OF MOTION 	259

-- 275 of 650 --

This downward velocity induces an increase in the angle of attack for the
horizontal tail, Dah, which can be defined as
Dah ¼ tan1 qXh
U1
 qXh
U1
This increase in angle of attack results in an increase in horizontal tail lift,
which can be quantified in terms of an increase in lift coefficient because of
pitch rate
DC L h ¼ CLah
ðDahÞ ¼ CLah
qX h
U1
 	
The change in lift coefficient for the entire aircraft then becomes (using the
techniques of Sec. 5.3.2)
DCL ¼ C Lah
qXh
U1
 	
Zh
S h
S ð6:46Þ
CL q may be determined using Eq. (6.47)
CL q ¼ @C L
@ qcc
2U1
¼ DC L
D qcc
2U1
¼ 2CLah
Xh
cc Zh
S h
S ¼ 2C Lah
Zh VVh 	ð6:47Þ
The derivative C L q will typically have a positive value and vary with Mach
number.
The final qcc=2U1 derivative to be considered is @M A=@ðqcc=2U1Þ. Again, we
have
@M A
@ qcc
2U1
¼ @C m qqS cc
@ qcc
2U1
¼ Cmq qq1S cc 	ð6:48Þ
Cm q results from the same increase in horizontal tail lift because of pitch rate
as was discussed for C L q. Thus, Eq. (6.47) is simply multiplied by the nondi-
mensional moment arm X h=cc and a negative sign is added to indicate that a
positive pitch rate results in a nose-down (negative) pitching moment.
C m q ¼ @C m
@ qcc
2U1
¼ 2CLah
Zh VVh
Xh
cc ð6:49Þ
Cm q is called the pitch damping derivative. It is a very important factor for
longitudinal dynamic stability characteristics. It is negative (providing a
moment that opposes the direction of the pitch rate) and will be the primary
factor (along with C m_aa ) for damping out pitch oscillations. For most aircraft,
260 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 276 of 650 --

the wing and fuselage also contribute to pitch damping; to account for this
effect, the value of C m q predicted by Eq. (6.49) is typically increased by
approximately 10%. Of course, for tailless aircraft the wing body contribution
becomes the primary contributor to C mq . An analysis of Eq. (6.49) reveals that
Cm q is proportional to the square of Xh ( VV h contains an X h term). Thus, Xh
becomes 	an 	important 	design 	parameter 	when 	considering 	longitudinal
dynamic stability.
Example 6.5
Find the qcc=2U1 derivative @FA z =@ðqcc=2U1Þ for the F-4C aircraft at the same
flight conditions as those of Example 6.2. CL q is equal to 1.80. If q is
2.5 deg=s, find the perturbed aero force along the z stability axis ( fA z ).
Starting with Eq. (6.45),
@FAz
@ qcc
2U1
¼ CL q qq1S ¼ 1:8ð283:2Þð530Þ
@FAz
@ qcc
2U1
¼ 270;172:8 lb=rad
To find f Az, we use Eq. (6.12) for only a q perturbation
fA z ¼ @FAz
@ qcc
2U1
qcc
2U1
 	
¼ 270;172:8 ð2:5=57:3Þð16Þ
2ð876Þ
 	
¼ 107:7 lb
Notice that degrees=second are converted to radians=second to maintain consis-
tent units. Because fA z is positive along the positive z stability axis, we have
predicted 107.7 lb increase in lift if pitch rate perturbs by 2.5 deg=s.
Example 6.6
Estimate the pitch damping derivative, C mq , for an aircraft with the follow-
ing characteristics: C Lah
¼ 0:075=deg, Zh ¼ 0:98, VV h ¼ 0:375, ðX h=ccÞ ¼ 3:0.
Starting with Eq. (6.49),
Cm q ¼ 2C Lah
Zh VVh
Xh
cc ¼ 2ð0:075Þð57:3Þ0:98ð0:375Þ3:0
Cm q ¼ 9:48=rad
Notice that CLah
has been converted to per radian.
LINEARIZING THE EQUATIONS OF MOTION 	261

-- 277 of 650 --

6.3.2.5 ^dde derivatives. 	The ^dde derivatives consist of @F Ax =@^dde, @M A=@de,
and @F Az =@^dde in Eq. (6.12). Using a similar development to that for the previous
derivatives, we have
@F Ax
@^dde
¼ @ðC x qqSÞ
@^dde
¼ C x^dde
qqS ¼ CD^dde
qq1S 	ð6:50Þ
CD^dde
is the change in drag coefficient because of elevator deflection. As
discussed in Sec. 5.3.1, it is typically very small and usually assumed to be
equal to zero.
@M A=@^dde becomes
@M A
@^dde
¼ @Cm qqS cc
@de
¼ Cm^dde
qq1S cc 	ð6:51Þ
Cm^dde
is the change in pitching moment coefficient because of elevator deflec-
tion and is a primary control derivative, as discussed in Sec. 5.2. It is also
referred to as the elevator control power derivative. It was previously defined
with Eq. (5.46).
Finally, @F Az =@^dde becomes
@F Az
@^dde
¼ @ðCz qqSÞ
@^dde
¼ C z^dde
qqS ¼ C L^dde
qq1S 	ð6:52Þ
CL^dde
is the change in lift coefficient because of elevator deflection. This deriva-
tive was discussed in Sec. 5.3.2 and was defined with Eq. (5.32).
The ^dde derivatives were developed assuming a conventional (tail aft) aircraft
with a horizontal tail and elevator configuration. Of course, a variety of other
longitudinal control configurations may be used with modern aircraft. These
include stabilators, canards, and flaps. For these cases, appropriate control deri-
vatives must be developed using the same approach presented here for the ^dde
derivatives.
Example 6.7
Find the ^dde derivative @M A=@^dde for the F-4C aircraft at the same flight
conditions as those of Example 6.2. Cmde
is equal to 0.058=rad. If ^dde is
1 deg, find the perturbed pitching moment, m A.
Starting with Eq. (6.51),
@M A
@^dde
¼ Cm^dde
qq1S cc ¼ 0:058ð283:2Þ530ð16Þ ¼ 139;289 ft  lb=rad
262 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 278 of 650 --

To find mA, we use Eq. (6.12) for only a ^dde perturbation
m A ¼ @M A
@de
^dde ¼ ð139;289Þð1=57:3Þ ¼ 2430:9 ft  lb
Notice that degrees are converted to radians to maintain consistent units.
6.3.2.6 Summary. 	We now are able to define the longitudinal perturbed
forces and moments from Eqs. (6.12) using the derivatives developed in Secs.
6.3.2.1–6.3.2.5. This recasting of the equations will use matrix format and Eqs.
(6.19), (6.22), (6.26), (6.28), (6.29), (6.31–6.33), (6.42), (6.44), (6.45), (6.48),
and (6.50–6.52), resulting in
f Ax
qq1S
m A
qq1S cc
f Az
qq1S
2
6
6
6
6
6
6
6
6
4
3
7
7
7
7
7
7
7
7
5
¼
ðCD u þ 2CD1 Þ 	ðC D^aa þ CL1 Þ 	CD_aa 	CD q 	CD^dde
ðCm u þ 2Cm1 Þ 	Cm^aa 	Cm_aa 	Cm q 	Cm^dde
ðC L u þ 2CL1 Þ 	ðC L^aa þ C D1 Þ 	C L_aa 	C L q 	C L^dde
2
6
4
3
7
5
u
U1
^aa
_aacc
2U1
qcc
2U1
^dde
2
6
6
6
6
6
6
6
6
6
6
6
6
4
3
7
7
7
7
7
7
7
7
7
7
7
7
5
ð6:53Þ
The advantage of Eq. (6.53) over Eq. (6.12) is that the longitudinal perturbed
forces and moments are now expressed in terms of common aero derivatives
such as CD u , Cm^aa , and C L q . The value of these derivatives can be estimated
with analytical or experimental techniques. Remember that each derivative in
Eq. (6.53) is dimensionless—for example, Cm u is the abbreviated form of
@Cm=@ðu=U1Þ, as discussed in Sec. 6.3.1. Table 6.1 summarizes the coefficients
and derivatives discussed for the perturbed longitudinal forces and moment
estimates.
Finally, the derivatives associated with the perturbed quantities ^aa, q, and ^dde
will, in most cases, be equal to the same derivatives with respect to the abso-
lute quantities a, Q, and de. For example, Cm^aa  Cma , Cm q  C mQ , and
C m^dde
 C mde
, because each derivative represents a change in the value of the
pitching moment coefficient with respect to a change in the value of angle of
attack, pitch rate, and elevator deflection, respectively.
6.3.3 	Lateral-Directional Perturbed Force and Moment Derivatives
We will next analyze each of the partial derivative terms in Eq. (6.13) so
that they may also be expressed with common lateral-directional aerodynamic
coefficients such as C y, C1 and C n. The process is similar to that presented in
Sec. 6.3.2 for the longitudinal derivatives. It is helpful to recall from Fig. 5.24
that a positive sideslip angle (b) is defined as the relative wind oriented to the
LINEARIZING THE EQUATIONS OF MOTION 	263

-- 279 of 650 --

right of the aircraft nose or, from the pilot’s perspective, ‘‘wind in the right
ear.’’ A review of the lateral-directional control deflection sign convention from
Sec. 5.2 is also helpful. Trailing edge up right aileron deflection and trailing
edge down left aileron deflection is defined as a positive da. Trailing edge left
rudder deflection is defined as a positive dr.
6.3.3.1 Sideslip ‘‘b’’ derivatives. 	The b derivatives consist of @L A=@b,
@FA y =@b, and @NA=@b in Eq. (6.13). We will begin with @L A=@b. L A is the
aerodynamic rolling moment and may be defined in terms of the rolling moment
coefficient C1 with Eq. (5.87).
L A ¼ Cl qq1Sb
We then have
@LA
@b ¼ @C1
@b qq1Sb ¼ C lb qq1Sb 	ð6:54Þ
Clb is the lateral (roll) static stability derivative as discussed in Sec. 5.5.2.1.
It must be negative if an aircraft has roll static stability. An estimate of Clb can
be obtained through analysis of the four aircraft design aspects that have the
greatest influence on C lb , namely, geometric dihedral, wing position, wing
sweep angle, and the vertical tail. Reference 1 presents such an approach.
However, because of the complex interaction of each design feature, wind
tunnel and=or computational fluid dynamic analysis is also suggested.
Table 6.1 	Summary of longitudinal derivatives
Derivative 	Name 	Normal sign
CD u 	Speed damping derivative 	þ or 
Cm u 	Mach tuck derivative 	þ or 
CLu 	None 	þ or 
CD^aa 	None 	þ
Cm^aa 	Longitudinal static stability derivative 	
CL^aa 	Lift curve slope 	þ
CD_aa 	Quasi-steady derivative 	 0
Cm_aa 	Quasi-steady derivative 	
CL_aa 	Quasi-steady derivative 	þ
CD q 	None 	 0
Cm q 	Pitch damping derivative 	
CLq 	None 	þ
CD^dde
None 	 0
Cm^dde
Elevator control power 	
CL^dde
None 	þ
264 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 280 of 650 --

In a similar manner, development of @F Ay =@b begins with a restatement of
Eq. (5.85):
FA y ¼ C y qq1S
and
@FA y
@b ¼ @C y
@b qq1S ¼ C yb qq1S 	ð6:55Þ
The derivative Cyb is normally negative and was discussed in Sec. 5.5.1.
Finally, @N A=@b is developed in the same manner starting with Eq. (5.94).
NA ¼ Cn qq1Sb
We then have
@N A
@b ¼ @C n
@b qq1Sb ¼ C nb qq1Sb 	ð6:56Þ
The derivative C nb is the directional (yaw) static stability as discussed in Sec.
5.5.3.1. It must be positive for the aircraft to have directional static stability.
Example 6.8
Find the b derivative @LA=@b for the F-4C aircraft at 35,000 ft and Mach 0.9
(U1 ¼ 876 ft=s, qq ¼ 283:2 lb=ft 2 , S ¼ 530 ft2 , b ¼ 38:7 ft) if Clb ¼ 0:08. If b
is perturbed to 1 deg, find the perturbed rolling moment l A.
Starting with Eq. (6.54),
@LA
@b ¼ Clb qq1Sb ¼ 0:08ð283:2Þ530ð38:7Þ ¼ 464;697 ft  lb=rad
To find l A, we use Eq. (6.13) for only a b perturbation
l A ¼ @LA
@b b ¼ 464;697ð1=57:3Þ ¼ 8;109:9 ft=lb
Notice that degrees are converted to radians to maintain consistent units.
6.3.3.2 Quasi-steady _bbb=2U1 derivatives. 	Similar to the discussion of
Sec. 6.3.2.3, if a rate of change in sideslip ( _bb) is present, a lag in the development
of sidewash at the vertical tail occurs. Because the b derivatives assume that
the sidewash is fully developed, the _bbb=2U1 derivatives provide a correction to
the b derivatives when the aircraft is undergoing a rate of change in sideslip.
These derivatives are generally considered negligible because of the relatively
LINEARIZING THE EQUATIONS OF MOTION 	265

-- 281 of 650 --

unobstructed flow that is present at most vertical tails. However, they may be
significant in the high subsonic speed region.
The 	first 	_bbb=2U1 	derivative 	in 	Eq. 	(6.13) 	to 	be 	considered 	is
@LA=@ð _bbb=2U1Þ. Using a similar approach as with the b derivatives, we have:
@LA
@ _bbb
2U1
¼ @C l qq1Sb
@ _bbb
2U1
¼ C l_bb qq1Sb 	ð6:57Þ
The next two _bbb=2U1 derivatives follow the same pattern.
@FA y
@ _bbb
2U1
¼ @Cy qq1S
@ _bbb
2U1
¼ Cy_bb qq1S 	ð6:58Þ
@N A
@ _bbb
2U1
¼ @Cn qq1Sb
@ _bbb
2U1
¼ C n_bb qq1Sb 	ð6:59Þ
Methods for estimating the _bbb=2U1 derivatives are presented in several flight
mechanics and aircraft design texts.
6.3.3.3 Roll rate pb=2U1 derivatives. 	The pb=2U1 derivatives consist of
@LA=@ð pb=2U1Þ, @FA y =@ð pb=2U1Þ, and @N A=@ð pb=2U1Þ in Eq. (6.13). We begin
with @L A=@ð pb=2U1Þ.
@LA
@ pb
2U1
¼ @Cl
@ pb
2U1
qq1Sb ¼ Clp qq1Sb 	ð6:60Þ
The derivative C lp is called the roll damping derivative. It represents the
change in rolling moment coefficient with respect to nondimensional roll rate
and is usually negative (providing a moment that opposes the direction of the
roll rate). C lp is a very important factor for lateral-directional dynamic stability
characteristics. Three aircraft components have a primary influence on the
value of Cl p : the wing, the horizontal tail, and the vertical tail.
As illustrated in Fig. 6.7, roll rate induces a vertical velocity contribution on
the wing and horizontal tail. At the wing tips, this vertical velocity because of
roll rate has a magnitude of pb=2. Of course, the vertical velocity because of
roll rate decreases as the distance from the fuselage decreases.
Figure 6.8 illustrates how this vertical velocity because of roll rate changes
the angle of attack at the left and right wing tip.
Thus, with this illustration for a positive roll rate, an increase in angle of
attack is experienced on the right wing and a decrease in angle of attack is
experienced on the left wing. This change in angle of attack on the wings and
horizontal tail because of roll rate results in an increase in lift on the right
266 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 282 of 650 --

wing and a decrease in lift on the left wing. Thus, a roll damping moment is
created that is in the opposite direction of the roll rate and Cl p is negative. Of
course, this analysis assumes that the angle of attack remains below the stall
angle of attack on both wings. Methods for estimating the wing and horizontal
tail contribution to Cl p are presented in several flight mechanics and aircraft
design texts. In general terms, increases in the span and=or area of the wing
and horizontal tail will result in an increase in Clp .
The absolute value of this change in angle of attack at the wing tips due to
roll rate ðpb=2U1Þ is called the roll helix angle. It provides the basis for the
form of the nondimensionalization approach used for angular rates in Sec.
6.3.1. The roll helix angle has physical meaning as well. It can be thought of
generally as the angle that the wing tip light would make with the horizon for
an aircraft undergoing a roll rate (if observed as the aircraft passes through
wings level).
The contribution of the vertical tail to Clp may be estimated by first finding
the force on the vertical tail because of roll rate. Looking at the aircraft from
the rear using Fig. 6.9, we see that a positive roll rate creates a force on the
tail in the negative y direction. We call this sideforce F s, where FA yvertical
tail
¼ Fs.
Figure 6.10 analyzes the velocity components at the center of pressure for
the aircraft shown in Fig. 6.9. There is a velocity component in the x direction
because of the forward velocity and a velocity component in the y direction
because of the roll rate, p.
Fig. 6.7 	Wing velocity distribution because of roll rate.
Fig. 6.8 	Wing tip angle of attack change because of roll rate.
LINEARIZING THE EQUATIONS OF MOTION 	267

-- 283 of 650 --

The angle Dav is the same as an effective sideslip on the vertical tail and
may be approximated with the following equation:
Dav  pzv
U1
ð6:61Þ
Dav results in generation of the sideforce, Fs, based on the lift curve slope of
the vertical tail, CLav
. Fs therefore becomes
Fs ¼ CLav
Dav qqvSv ¼ CLav
pzv
U1
 	
qqvSv 	ð6:62Þ
This sideforce on the vertical tail because of roll rate also produces a negative
rolling moment (LAv ) about the center of gravity because it acts at zv above the
c.g. Recalling that, FA yvertical
tail
¼ Fs,
L Av ¼ FAyv
zv ¼ F s zv ¼ Clv qqSb 	ð6:63Þ
Fig. 6.9 	Rear view of aircraft undergoing positive roll rate.
Fig. 6.10 	Velocity components at the vertical tail resulting from positive roll rate.
268 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 284 of 650 --

Combining Eqs. (6.62) and (6.63), and solving for C lv , we have
C lv ¼ C Lav
pzv
U1
 	
Zv
Sv
S
zv
b
 
ð6:64Þ
Taking the partial derivative of Eq. (6.64) with respect to p,
@Clv
@p ¼ C Lav
zv
U1
 	
Zv
Sv
S
zv
b
 
Finally, we obtain an estimate for the vertical tail contribution to the roll damp-
ing derivative in nondimensional form
Cl pv
¼ @C1
@ pb
2U1
 	 ¼ 2U1
b
@Clv
@p ¼ 2CLav
zv
b
 2
Zv
Sv
S ð6:65Þ
Because CLav
, ðzv=bÞ2 , Zv, and Sv=S are all positive, C lpv
must be negative.
The next pb=2U1 derivative to be considered is @F Ay =@ð pb=2U1Þ. We begin
with
@F Ay
@ pb
2U1
¼ @Cy qqS
@ pb
2U1
¼ Cy p qq1S 	ð6:66Þ
The vertical tail is the major contributor to Cy p and the preceding analysis to
estimate Cl p is appropriate. Recalling that FA yvertical
tail
¼ Fs, we express Fs (the
side force because of roll rate) in terms of the side force coefficient of the
entire aircraft:
Fs ¼ FAyv
¼ Cyv qq1S 	ð6:67Þ
Equation (6.62) is then substituted into Eq. (6.67) and solved for C yv
C yv ¼ CLav
pzv
U1
 	 qqv
qq1
Sv
S
Taking the partial derivative with respect to p, we have
@Cyv
@p ¼ CLav
zv
U1
 	
Zv
Sv
S ð6:68Þ
LINEARIZING THE EQUATIONS OF MOTION 	269

-- 285 of 650 --

Finally, we obtain an estimate for the vertical tail contribution to the side force
with respect to roll rate derivative in nondimensional form
@C yv
@ pb
2U1
 	 ¼ 2U1
b
@C yv
@p ¼ Cy pv
 C y p 	ð6:69Þ
Combining Eqs. (6.68) and (6.69), we have
Cy p  2U1
b ðC Lav
Þ zv
U1
 	
Zv
Sv
S
Simplifying and rearranging, we have
Cy p  2CLav
zv
b
 
Zv
Sv
S ð6:70Þ
Cy p is generally negative; however, at high angles of attack, zv may become
negative as the center of pressure of the vertical tail drops below the x stability
axis. For that case, Cy p will be positive.
The final pb=2U1 derivative to be considered is @N A=@ð pb=2U1Þ. In a similar
manner, we have
@NA
@ pb
2U1
¼ @C n qqSb
@ pb
2U1
¼ Cn p qq1Sb 	ð6:71Þ
Cn p is called a cross derivative because it represents the change in yawing
moment coefficient (a moment about the z axis) because of a nondimensional
roll rate (an angular rate about the x axis). The wing and vertical tail are the
primary components that contribute to C np . The contribution of the horizontal
tail is typically small compared to the wing because of its smaller area.
The wing contributes to Cn p in three ways that will be addressed qualita-
tively. The first contribution comes from the 1) increase in drag that results
from the increase in angle of attack on the wing being rolled into, and 2)
decrease on drag that results from the decrease in angle of attack on the wing
being rolled away from. For example, a positive right wing down roll rate will
increase the angle of attack on the right wing and decrease the angle of attack
on the left wing. The increased drag on that results on the right wing and
decreased drag that results on the left wing will provide a positive yawing
moment to the aircraft, resulting in a positive contribution to C n p . The second
contribution to Cn p results from tilting of the lift vector on each wing because
of the change in angle of attack. Recall that lift is defined in a direction
perpendicular to the relative wind. For our example, the increase in angle of
attack on the right wing results in tilting of the lift vector forward, while the
decrease in angle of attack on the left wing provides an aft tilting of the lift
vector. The net result is a negative contribution to yawing moment; thus, a
270 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 286 of 650 --

negative contribution to C n p . The lift vector tilting effect is illustrated in Fig.
6.11.
The final contribution may result from an asymmetrical sideforce generated
at each wing tip. Again returning to our example with positive roll rate, the
right wing experiences higher lift (and lower upper surface pressure) because
of the increased angle of attack. Conversely, the left wing experiences a
decrease in lift (and higher upper surface pressure) because of the decreased
angle of attack. As a result, there is a greater tendency for a positive sideforce
to develop at the right wing tip as the flow migrates from the lower surface to
the low-pressure upper surface. At the left wing tip, a lower magnitude nega-
tive sideforce develops because the pressure on the left wing upper surface is
higher (a smaller differential pressure than on the right wing). The net result
should be a positive sideforce acting through the right wing tip. If this side-
force acts behind the c.g., a negative yawing moment results and the wing tip
sideforce effect makes a negative contribution to C n p as illustrated in Fig. 6.12.
If this sideforce acts in front of the c.g. (unusual), a positive yawing moment
results and the wing tip sideforce effect makes a positive contribution to Cn p .
The wing tip sideforce effect is most pronounced on low aspect ratio wings
(strong wing tip vorticies) with relatively thick wing tips.
The contribution of the vertical tail to Cn p results from the sideforce because
of roll rate (Fs) illustrated in Fig. 6.9 and defined by Eq. (6.62). As discussed
for a positive roll rate, a negative sideforce at the vertical tail results. This
negative sideforce produces a positive yawing moment provided the distance zv
is positive (the case for low to moderate angles of attack). Thus, the contribu-
tion of the vertical tail to C np is generally positive but may be negative at high
angles of attack. If we define xv as the distance from the c.g. to the aerody-
Fig. 6.11 	Illustration of lift vector tilting because of roll rate.
LINEARIZING THE EQUATIONS OF MOTION 	271

-- 287 of 650 --

namic center of the vertical tail, then a similar analysis to that which led to Eq.
(6.65) yields an estimate for the vertical contribution to C np .
Cn pv
¼ 2CLav
zv
b
  xv
b
 	
Zv
Sv
S ð6:72Þ
An estimate for the wing contribution to C np , C npw
, developed in some texts1
using wing strip theory, follows:
C npw
¼  CL
8
Two observations may be made regarding this estimate. First, C npw
is directly
proportional to the overall aircraft lift coefficient; second, the estimate assumes
that lift vector tilting is the dominant contribution based on the negative sign.
Cn p is one of the more difficult derivatives to estimate because some aircraft
components make positive contributions, others make negative contributions,
and in some cases the sign of the contribution depends on angle of attack.
Fortunately, in most applications C np has a relatively small influence on
dynamic stability characteristics.
Example 6.9
Find the pb=2U1 derivative @NA=@ð pb=2U1Þ for the F-4C at the same condi-
tions as presented in Example 6.7. C np for the F-4C is  0.036. If p is 5 deg=s,
find the perturbed yawing moment, n A.
Starting with Eq. (6.71),
@N A
@ pb
2U1
¼ Cn p qq1Sb ¼ 0:036ð283:2Þ530ð38:7Þ ¼ 209;114 ft  lb=rad
Fig. 6.12 	Illustration of wing tip sideforce effect because of positive roll rate.
272 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 288 of 650 --

To find n A, we use Eq. (6.13) for only a roll rate perturbation:
n A ¼ @NA
@ pb
2U1
pb
2U1
 	
¼ 209;114 ð5=57:3Þð38:7Þ
2ð876Þ
 	
¼ 403:1 ft  lb
Notice that degrees=second are converted to radians=second to maintain consis-
tent units.
6.3.3.4 Yaw rate rb=2U1 derivatives. 	The rb=2U1 derivatives consist of
@LA=@ðrb=2U1Þ, @F Ay =@ðrb=2U1Þ, and @NA=@ðrb=2U1Þ in Eq. (6.13). We begin
with @L A=@ðrb=2U1Þ.
@LA
@ rb
2U1
¼ @Cl
@ rb
2U1
qq1Sb ¼ Cl r qq1Sb 	ð6:73Þ
The derivative C lr is called a cross derivative. It represents the change in roll-
ing moment coefficient (a moment about the x axis) due to nondimensional
yaw rate (an angular rate about the z axis). The wing and vertical tail are the
primary aircraft components that contribute to C lr .
The wing contribution to C l r results from the yaw rate increasing the effec-
tive velocity on one wing and decreasing the effective velocity on the opposite
wing. For example, a positive nose right yaw rate will provide an angular rate
that increases the effective velocity on the left wing and that decreases the
effective velocity on the right wing. The increase in velocity results in
increased lift on the left wing, and the decrease in velocity results in decreased
lift on the right wing. The net result is a positive rolling moment (right wing
down). Thus, the wings make a positive contribution to C lr .
The vertical tail contribution to C lr results from the change in angle of
attack (actually a sideslip angle) experienced by the vertical tail because of
yaw rate. For example, for a positive yaw rate, the vertical tail will experience
an increase in angle of attack—actually sideslip—(Dav) on the left side of the
vertical tail, which produces a side force (F s) in the positive y direction. This
is illustrated in Fig. 6.13.
The angle Dav is the effective sideslip on the vertical tail and may be
approximated with the following equation:
Dav  rxv
U1
ð6:74Þ
where xv is the distance from the c.g. to the a.c. of the vertical tail. Fs therefore
becomes
Fs ¼ CLav
Dav qqvSv ¼ C Lav
rxv
U1
 	
qqvSv 	ð6:75Þ
LINEARIZING THE EQUATIONS OF MOTION 	273

-- 289 of 650 --

This sideforce on the vertical tail because of yaw rate also produces a positive
rolling moment (LAv ) about the center of gravity because it acts at zv (see Fig.
6.9) above the c.g. Thus,
L Av ¼ Fs zv ¼ C lv qqSb 	ð6:76Þ
Combining Eqs. (6.75) and (6.76), and solving for C lv , we have
Clv ¼ CLav
rxv
U1
 	
Zv
Sv
S
zv
b
 
ð6:77Þ
Taking the partial derivative of Eq. (6.77) with respect to r,
@C ly
@r ¼ CLav
xv
U1
 	
Zv
Sv
S
zv
b
 
Finally, we obtain an estimate for the vertical tail contribution to C lr . In non-
dimensional form
C lrv
¼ @C1
@ rb
2U1
 	 ¼ 2U1
b
@Clv
@r ¼ 2C Lav
xvzv
b2
 	
Zv
Sv
S ð6:78Þ
As seen from Eq. (6.78), the vertical tail makes a positive contribution to C lr
at low to moderate values of angle of attack where zv is positive. However, at
high angles of attack, zv may be negative and then the vertical tail contribution
to Cl r will be negative. Because the wing contribution normally outweighs the
vertical tail contribution to Cl r , Clr is usually positive for most flight condi-
tions.
Fig. 6.13 	Illustration of sideforce and change in angle of attack at the vertical tail
resulting from positive yaw rate.
274 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 290 of 650 --

The next rb=2U1 derivative to be considered is @FA y =@ðrb=2U1Þ. We begin
with
@F Ay
@ rb
2U1
¼ @C y qqS
@ rb
2U1
¼ Cy r qq1S 	ð6:79Þ
The vertical tail is the major contributor to Cy r and the preceding analysis to
estimate C lr is appropriate. We begin with the estimate of sideforce on the
vertical tail because of roll rate (F s) defined by Eq. (6.75).
Fs ¼ CLav
rxv
U1
 	
qqvSv ¼ Cyv qq1S 	ð6:80Þ
Solving for Cyv ,
Cyv ¼ C Lav
rxv
U1
 	
Zv
Sv
S
Taking the partial derivative with respect to r, we have
@C yv
@r ¼ C Lav
xv
U1
 	
Zv
Sv
S ð6:81Þ
Finally, Cy r may be obtained in nondimensional form
@C yv
@ rb
2U1
 	 ¼ 2U1
b
@C yv
@r ¼ Cy rv
 Cy r 	ð6:82Þ
Combining Eqs. (6.81) and (6.82), we have
Cy r  2CLav
xv
b
 	
Zv
Sv
S ð6:83Þ
Cy r is a positive derivative because a positive yaw rate results in a positive
sideforce on the vertical tail.
The final rb=2U1 derivative to be considered is @NA=@ðrb=2U1Þ. In a similar
manner, we have
@NA
@ rb
2U1
¼ @C n qqSb
@ rb
2U1
¼ Cn r qq1Sb 	ð6:84Þ
The derivative Cn r is called the yaw damping derivative. It represents the
change in yawing moment coefficient with respect to nondimensional yaw rate
and will always be negative (providing a moment which opposes the direction
LINEARIZING THE EQUATIONS OF MOTION 	275

-- 291 of 650 --

of the yaw rate). C nr is also an important factor in lateral-directional stability
characteristics. The wing and vertical tail are the primary components that
contribute to Cn r .
The wing contribution to Cn r results from the yaw rate, increasing the effec-
tive velocity on one wing and decreasing the effective velocity on the opposite
wing as discussed previously. A positive ‘‘nose right’’ yaw rate will provide an
angular rate that increases the effective velocity on the left wing and decreases
the effective velocity on the right wing. The increase in velocity results in
increased lift and induced drag on the left wing, and the decrease in velocity
results in decreased lift and decreased induced drag on the right wing. The net
result is a negative yawing moment (nose left). Thus, the wings make a nega-
tive contribution to C nr .
The vertical tail contribution to Cn r results from the sideforce (Fs) on the
vertical tail resulting from yaw rate as presented in Eq. (6.75). Referring also
to Fig. 6.13, the yawing moment resulting from a positive yaw rate on the
aircraft is
NAv ¼ Fs xv ¼ Cnv qqSb 	ð6:85Þ
Combining Eqs. (6.75) and (6.85) and solving for C nv , we have
Cnv ¼ C Lav
rxv
U1
 	
Zv
Sv
S
xv
b
 	
ð6:86Þ
Taking the partial derivative of Eq. (6.86) with respect to r,
@Cnv
@r ¼ CLav
xv
U1
 	
Zv
Sv
S
xv
b
 	
ð6:87Þ
Finally, Cn r may be obtained in nondimensional form
@Cnv
@ rb
2U1
 	 ¼ 2U1
b
@Cnv
@r ¼ Cn rv
ð6:88Þ
Combining Eqs. (6.87) and (6.88), we have
Cn rv
¼ CLav
2x2
v
b2
 	
Zv
Sv
S ð6:89Þ
Equation (6.89) provides an estimate of the vertical tail contribution to C nr ,
which can also be seen to be negative. For a complete estimate of Cn r , the
wing contribution must be added to this estimate.
276 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 292 of 650 --

Example 6.10
Estimate the yaw damping derivative, C n r , for an aircraft based on the
contribution of the vertical tail. The aircraft has the following characteristics
C Lav
¼ 0:08=deg; xv
b ¼ 0:6; 	Zv ¼ 0:95; Sv
S ¼ 0:125
Starting with Eq. (6.89),
Cn rv
¼ CLav
2x2
v
b2
 	
Zv
Sv
S ¼ ð0:08Þð57:3Þ2ð0:6Þ2ð0:95Þð0:125Þ
Cn rv
¼ 0:392
Notice that C Lav
has been converted to ‘‘per radian’’ to keep consistent units.
6.3.3.5 da derivatives. 	The da derivatives consist of @L A=, @FAy =@da, and
@NA=@da in Eq. (6.13). Using a similar development to that for the previous
derivatives, we have
@LA
@da
¼ @C l
@da
qq1Sb ¼ Clda
qq1Sb 	ð6:90Þ
Clda
is a primary control derivative and is also called the aileron control
power. It was discussed in Sec. 5.5.2.2. The sign of C lda
is positive with our
sign convention. Thus, a positive aileron deflection (normally right aileron trail-
ing edge up=left aileron trailing edge down) will produce a positive rolling
moment.
@FA y =@da is developed in a similar manner.
@FA y
@da
¼ @C y
@da
qq1S ¼ C yda
qq1S 	ð6:91Þ
Cyda
is the change in sideforce coefficient resulting from an aileron deflection.
It generally has a negligible value. It may have a negative value for situations
where differential horizontal tail is used to generate rolling moment as
discussed in Sec. 5.5.1.
Finally, the development of @NA=@da follows the same approach.
@N A
@da
¼ @C n
@da
qq1Sb ¼ C nda
qq1Sb 	ð6:92Þ
Cnda
is a cross-control derivative that was discussed in Sec. 5.5.3.2. If it is
positive, the aircraft exhibits proverse yaw. More typically, it is negative, indi-
cating that adverse yaw is generated as a result of an aileron input.
LINEARIZING THE EQUATIONS OF MOTION 	277

-- 293 of 650 --

6.3.3.6 dr derivatives. 	The dr derivatives are @LA=@dr, @F Ay =@dr, and
@NA=@dr in Eq. (6.13). Using the same approach as with the da derivatives,
@LA
@dr
¼ @Cl
@dr
qq1Sb ¼ C ldr
qq1Sb 	ð6:93Þ
Cldr
is a cross-control derivative that was discussed in Sec. 5.5.2.3. It is
usually positive because the rudder is normally above the x-body axis.
@FA y =@dr is developed in a similar manner.
@F Ay
@dr
¼ @C y
@dr
qq1S ¼ C ydr
qq1S 	ð6:94Þ
Cydr
is the change in sideforce coefficient resulting from a rudder deflection.
It was discussed in Sec. 5.5.1. and generally has a positive value because a
positive rudder deflection will generate a sideforce along the positive y axis.
Finally, the development of @NA=@dr follows the same approach.
@NA
@dr
¼ @C n
@dr
qq1Sb ¼ C ndr
qq1Sb 	ð6:95Þ
Cndr
is a primary control derivative and is also called the rudder control
power. It was discussed in Sec. 5.5.3.3. The sign of Cndr
is negative with our
sign convention. Thus, a positive rudder deflection (trailing edge left) will
produce a negative yawing moment.
6.3.3.7 Summary. 	We now define the lateral-directional forces and
moments from Eq. (6.13) using the derivatives developed in Secs. 6.3.3.1–
6.3.3.6. This recasting of the equations will use matrix format and Eqs. (6.54–
6.60), (6.66), (6.71), (6.73), (6.79), (6.84), and (6.90–6.95), resulting in
lA
qq1Sb
f Ay
qq1S
n A
qq1Sb
2
6
6
6
6
6
6
6
6
4
3
7
7
7
7
7
7
7
7
5
¼
C lb 	C l_bb 	C lp 	Clr 	Clda
Cldr
C yb 	C y_bb C yp 	C y r 	C yda
Cydr
C nb 	C n_bb C np 	Cn r 	Cnda
Cndr
2
6
4
3
7
5
b
_bbb
2U1
pb
2U1
rb
2U1
^dda
^ddr
2
6
6
6
6
6
6
6
6
6
6
6
6
6
6
6
6
6
6
4
3
7
7
7
7
7
7
7
7
7
7
7
7
7
7
7
7
7
7
5
ð6:96Þ
278 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 294 of 650 --

The advantage of Eq. (6.96) over Eq. (6.13) is that the lateral-directional
perturbed forces and moments are now expressed in terms of common ‘‘aero’’
derivatives such as C lb , C ydr
, and C nr . The value of these derivatives can be
estimated with analytical or experimental techniques. Remember that each deri-
vative in Eq. (6.96) is dimensionless—for example, Cn r is the abbreviated form
of @Cn=@ðrb=2U1Þ. Table 6.2 summarizes the derivatives discussed for the
perturbed lateral-directional force and moment estimates.
6.4 	First-Order Approximation of Perturbed Thrust Forces and
Moments
We will now focus on the perturbed thrust force and moment terms (such as
f T x and m T ) in Eqs. (6.6) and (6.7). These represent the perturbed change in a
thrust force or moment that results from a nonzero value of a perturbation vari-
able like u. We begin with the assumption that these perturbed thrust terms are
only a function of u, ^aa, and b, which is generally the case but does neglect
effects from p, q, r, _aa, _bb, and the control deflections. The longitudinal
perturbed thrust forces and moment can thus be represented using a Taylor
Table 6.2 	Summary of lateral-directional derivatives
Derivative 	Name 	Normal sign
Clb 	Lateral static stability derivative 	
Cyb 	None 	
Cnb 	Directional static stability derivative 	þ
Cl_bb Quasi-steady derivative 	 0
Cy_bb Quasi-steady derivative 	 0
Cn_bb Quasi-steady derivative 	 0
Cl p 	Roll damping derivative 	
Cy p 	None 	
Cn p 	Cross derivative 	þ or 
Cl r 	Cross derivative 	þ
Cy r 	None 	þ
Cn r 	Yaw damping derivative 	
Clda
Aileron control power 	þ
Cyda
None 	 0
Cnda
Cross control derivative (proverse or adverse yaw) 	þ or 
Cldr
Cross control derivative 	þ
Cydr
None 	þ
Cndr
Rudder control power 	
LINEARIZING THE EQUATIONS OF MOTION 	279

-- 295 of 650 --

series and the nondimensional perturbed longitudinal variables (defined along
the x, y, and z stability axis) as
f T x ¼ @FT x
@ u
U1
 	 u
U1
 	
þ @FT x
@^aa ^aa 	ð6:97Þ
m T ¼ @M T
@ u
U1
 	 u
U1
 	
þ @M T
@^aa ^aa 	ð6:98Þ
f T z ¼ @F T z
@ u
U1
 	 u
U1
 	
þ @FT z
@^aa ^aa 	ð6:99Þ
The longitudinal thrust forces and moment can be expressed in coefficient
form as
FT x ¼ CT x qq1S 	ð6:100Þ
M T ¼ Cm T qq1S cc 	ð6:101Þ
FT z ¼ CT z qq1S 	ð6:102Þ
The lateral-directional perturbed thrust force and moments can be represented
in a similar manner as a function of b
lT ¼ @LT
@b b 	ð6:103Þ
f T y ¼ @F T y
@b b 	ð6:104Þ
n T ¼ @N T
@b b 	ð6:105Þ
The lateral-directional thrust force and moments can be expressed in coefficient
form as
L T ¼ C lT qq1Sb 	ð6:106Þ
F T y ¼ C T y qq1S 	ð6:107Þ
N T ¼ C nT qq1Sb 	ð6:108Þ
6.4.1 	Longitudinal Perturbed Thrust Force and Moment Derivatives
We will next analyze each of the partial derivative terms in Eqs. (6.97–6.99)
so that they may be expressed with common thrust coefficient derivatives.
280 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 296 of 650 --

6.4.1.1 u=U1 derivatives. 	The u=U1 derivatives consist of @FT x =@ðu=U1Þ,
@M T =@ðu=U1Þ, and @F T z =@ðu=U1Þ in Eqs. (6.97–6.99). We will begin with
@FT x =@ðu=U1Þ. F T x is defined along the body-fixed stability x axis as discussed
in Secs. 6.3.2. and 6.3.2.1. Using a similar approach as that for @FA x =@ðu=U1Þ in
Sec. 6.3.2.1, we have
@FT x
@ u
U1
¼ @CT x
@ u
U1
qqS þ C T x S @qq
@ u
U1
0
B
@
1
C
A ¼ CT xu
qq1S þ 2CT x1
qq1S 	ð6:109Þ
In comparing Eq. (6.109) to Eq. (6.19), notice the similarities with the excep-
tion of the negative sign in Eq. (6.19). This results because drag is defined as
positive in the negative x direction while thrust is defined as positive in the
positive x direction. For gliders or power-off flight, CT xu
and C T x1
are equal to
zero and thus @F T x =@ðu=U1Þ becomes zero. Estimates of C T xu	
and CT x1
for
powered cases are dependent of the type of propulsion system used in the
aircraft.
The next u=U1 derivative to be considered is @M T =@ðu=U1Þ. Using a similar
approach as that for @M A=@ðu=U1Þ in Sec. 6.3.2.1, we have
@M T
@ u
U1
¼ Cm Tu
qq1S cc þ C mT1
S ccð2qq1Þ 	ð6:110Þ
and, in combined form
@MT
@ u
U1
¼ ðCm Tu
þ 2Cm T1
Þqq1S cc 	ð6:111Þ
For steady-state trimmed flight, the total pitching moment acting on the aircraft
should be zero. Thus, the sum of the steady-state thrust pitching moment and
steady-state aerodynamic pitching moment [referring to Eq. (6.22)] should be
Cm T1
þ Cm1 ¼ 0 	@ trim 	ð6:112Þ
Combining Eqs. (6.22), (6.111), and (6.112), we have
@ðM A þ M T Þ
@ u
U1
¼ ðC mu þ Cm Tu
Þqq1S cc 	ð6:113Þ
The derivative C mTu
has a negligible value for situations where the thrust vector
passes through the center of gravity.
LINEARIZING THE EQUATIONS OF MOTION 	281

-- 297 of 650 --

The last u=U1 derivative is @FT z =@ðu=U1Þ. Again, using a similar approach
as that for @FAz =@ðu=U1Þ in Sec. 6.3.2.1, we have
@FT z
@ u
U1
 	 ¼ ðC T zu
þ 2CT z1
Þqq1S 	ð6:114Þ
In comparing Eq. (6.114) to Eq. (6.26), notice the similarities with the excep-
tion of the negative sign in Eq. (6.26). This results because lift is defined as
positive in the negative z direction while the z component of thrust is defined
as positive in the positive z direction.
6.4.1.2 ^aa derivatives. 	The ^aa, or perturbed angle of attack derivatives,
consist of @F T x =@^aa, @M T =@^aa, and @FT z =@^aa in Eqs. (6.97–6.99). We begin with
@FT x =@^aa, which is simply
@F T x
@^aa ¼ C T x^aa
qq1S 	ð6:115Þ
CT x^aa
is typically negligible for normal angle of attack ranges.
@M T =@^aa follows a similar approach.
@M T
@^aa ¼ C mT^aa
qq1S cc 	ð6:116Þ
Cm T^aa
is a significant derivative because of momentum forces in the z direction
that result from turning the flow through the engine. For example, if ^aa is posi-
tive an increase in the turning angle of the flow through the engine results,
along with an increase in the force associated with the change in momentum
direction (which is in the negative z direction). Because this force generally
acts at the nacelle of the engine, a pitching moment results about the aircraft
c.g. because of the moment arm x d . This effect is illustrated in Fig. 6.14.
For aircraft with the engine nacelle located in front of c.g., a positive CmT^aa
results that provides a destabilizing contribution to the overall C ma (longitudinal
Fig. 6.14 	Illustration of change in C mT because of ^aa.
282 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 298 of 650 --

stability) of the aircraft. For aircraft with the engine nacelles located aft of the
c.g. (such as the A-10), a negative C m T^aa
results that provides a stable contribu-
tion to overall longitudinal stability. Finally, the magnitude of C mT^aa
is also
dependent on the thrust (and airflow) being produced by the engine at the time
of evaluation because the force due to the change in momentum direction is
dependent on the magnitude of the momentum.
The last ^aa derivative to be considered is @F T z =@^aa, which is simply
@FT z
@^aa ¼ C T z^aa
qq1S 	ð6:117Þ
CT z^aa
results from the same z-direction force accompanying the change in
momentum direction discussed for C m T^aa
. Again, this force is illustrated in Fig.
6.14.
Actual determination of the thrust derivatives depends on the specific
engine and inlet characteristics of a particular aircraft. These must be available
before accurate estimates of the thrust derivatives can be made.
6.4.2 	Lateral-Directional Perturbed Thrust Force and Moment
Derivatives
The b derivatives consist of @L T =@b, @FT y =@b, and @NT =@b in Eqs. (6.103–
6.105). We begin with @L T =@b, which is simply
@LT
@b ¼ Cl Tb
qq1Sb 	ð6:118Þ
Cl Tb
is typically negligible for normal angle of attack and sideslip ranges.
@FT y =@b follows a similar approach
@FT y
@b ¼ CT yb
qq1S 	ð6:119Þ
CT yb
results from the sideforce associated with the change in momentum direc-
tion when the flow is turned through the engine. For example, if b is positive
the turning angle of the flow through the engine results in a sideforce in the
negative y direction, as illustrated in Fig. 6.15. For most flight conditions, C T yb
is small and can be considered negligible.
LINEARIZING THE EQUATIONS OF MOTION 	283

-- 299 of 650 --

The last b derivative to be considered is @N T =@b, which is simply
@NT
@b ¼ Cn Tb
qq1Sb 	ð6:120Þ
Cn Tb
also results from the sideforce associated with the change in momentum
direction when the flow is turned through the engine. By referring to Fig. 6.15,
a positive b results in a sideforce in the negative y direction applied at the
engine nacelle. For the case illustrated, this sideforce is located in front of the
c.g. As a result, a negative yawing moment results (C n Tb
negative) and a nega-
tive contribution is made to the overall directional stability of the aircraft. For
aircraft with the engine nacelles located aft of the c.g., a positive Cn Tb
results,
which provides a stable contribution to overall directional stability. Of course,
the magnitude of C nTb
is also dependent on the thrust (and airflow) being
produced by the engine at the time of evaluation.
6.4.3 	Summary
We are now able to define first-order approximations of the perturbed thrust
forces and moments in Eqs. (6.6) and (6.7) using the derivatives developed in
Sec. 6.4.1. This recasting of the equations will use matrix format and Eqs.
(6.109), (6.111), and (6.114–6.120). For longitudinal motion, we have
f T x
qq1S
m T
qq1S cc
f T z
qq1S
2
6
6
6
6
6
6
6
6
4
3
7
7
7
7
7
7
7
7
5
¼
ðCT xu
þ 2CT x1
Þ 	C T x^aa
ðCm Tu
þ 2Cm T1
Þ 	C mT^aa
ðC T zu
þ 2CT z1
Þ 	CT z^aa
2
6
4
3
7
5
u
U1
^aa
2
4
3
5 	ð6:121Þ
Fig. 6.15 	Illustration of C T y because of b.
284 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 300 of 650 --

For lateral-directional motion, we have
lT
qq1Sb
f T y
qq1S
n T
qq1Sb
2
6
6
6
6
6
6
6
6
4
3
7
7
7
7
7
7
7
7
5
¼
Cl Tb
C T yb
Cn Tb
2
6
4
3
7
5b 	ð6:122Þ
Equations (6.121) and (6.122) are typically simplified based on the negligible
value of several derivatives to the following:
f T x
qq1S
m T
qq1S cc
f T z
qq1S
2
6
6
6
6
6
6
6
6
6
4
3
7
7
7
7
7
7
7
7
7
5
¼
ðCT xu
þ 2CT x1
Þ 	0
ðCm Tu
þ 2Cm T1
Þ 	C mT^aa
0 	0
2
6
4
3
7
5
u
U1
^aa
2
6
4
3
7
5 	ð6:123Þ
l T
qq1Sb
f T y
qq1S
n T
qq1Sb
2
6
6
6
6
6
6
6
6
6
4
3
7
7
7
7
7
7
7
7
7
5
¼
0
0
C nTb
2
6
4
3
7
5b 	ð6:124Þ
6.5 	Recasting the Equations of Motion in Acceleration Format
It is now time to combine our development of the linearized aircraft EOM
simplified for wings level, straight flight Eqs. (6.6) and (6.7) with our develop-
ment of first-order approximations for the perturbed aero and thrust forces=
moments (see Secs. 6.3 and 6.4).
6.5.1 	Longitudinal EOM
For the longitudinal EOM, we begin with Eq. (6.6) and substitute in Eq.
(6.53) for the perturbed aero forces and moments, and Eq. (6.123) for the
LINEARIZING THE EQUATIONS OF MOTION 	285

-- 301 of 650 --

perturbed thrust forces and moments. In addition, we neglect derivatives that
typically have negligible values. This results in:
m_uu ¼ mgy cos Y1
þ qq1S
ðC Du þ 2CD1 Þ u
U1
þ ðCT xu
þ 2CT x1
Þ u
U1
þ ð CD^aa þ CL1 Þ^aa  C D^dde
^dde
2
6
4
3
7
5
Iyy _qq ¼ qq1S cc
ðC mu þ 2Cm1 Þ u
U1
þ ðCm Tu
þ 2Cm T1
Þ u
U1
þ Cm^aa ^aa þ Cm T^aa
^aa þ Cm_aa
_aacc
2U1
þ Cm q
qcc
2U1
þ C m^dde
^dde
2
6
6
4
3
7
7
5 ð6:125Þ
mð _ww  U1qÞ ¼ mgy sin Y1
þ qq1S
ðC L u þ 2C L1 Þ u
U1
 ðCL^aa þ C D1 Þ^aa
 C L_aa
_aacc
2U1
 CL q
qcc
2U1
 CL^dde
^dde
2
6
6
4
3
7
7
5
Next, the x and z force equations of Eq. (6.125) are divided by the mass (m)
and grouped first and second, while the pitching moment equation of Eq.
(6.125) is divided by the moment of inertia about the y axis (Iyy) and presented
last. This results in
_uu ¼ gy cos Y1
þ qq1S
m
 C D u þ 2CD1
 	 u
U1
þ C T xu
þ 2CT x1
 	 u
U1
þ C D^aa þ CL1
 	
^aa  CD^dde
^dde
2
6
4
3
7
5
ð _ww  U1qÞ ¼ gy sin Y1
þ qq1S
m
 C L u þ 2CL1
 	 u
U1
 C L^aa þ C D1
 	
^aa
CL_aa
_aacc
2U1
 CL q
qcc
2U1
 CL^dde
^dde
2
6
6
4
3
7
7
5 	ð6:126Þ
_qq ¼ qq1S cc
I yy
Cm u þ 2C m1
 	 u
U1
þ Cm Tu
þ 2C mT1
 	 u
U1
þ C m^aa ^aa þ Cm T^aa
^aa þ Cm_aa
_aacc
2U1
þ C mq
qcc
2U1
þ Cm^dde
^dde
2
6
6
4
3
7
7
5
This results in each term on the right-hand side of Eq. (6.126) having units of
linear or angular acceleration.
286 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 302 of 650 --

6.5.2 	Longitudinal Stability Parameters
To simplify Eq. (6.126) and to gain understanding of the relative contribu-
tions of each term in these equations, we next introduce the concept of stab-
ility parameters or dimensional stability derivatives. Stability parameters
represent the linear or angular acceleration per motion or control variable (u, ^aa,
_aa, q, and ^dde) for each term in the right-hand side of Eq. (6.126). For example,
we will rewrite the x force equation of Eq. (6.126) so that the appropriate stabi-
lity parameters can be identified
_uu ¼ gy cos Y1  qq1S
mU1
ðCD u þ 2CD1 Þ
|fflfflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflfflffl}
X u
u þ qq1S
mU1
ðCT xu
þ 2CT x1
Þ
|fflfflfflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl}
X Tu
u
þ qq1S
m ðCD^aa þ C L1 Þ
|fflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflffl}
Xa
^aa  qq1S
m CD^dde	
|fflfflfflffl{zfflfflfflffl}
Xde
^dde
The stability parameters Xu, X T u , Xa, and Xde can be seen to be simply a group-
ing of the terms multiplying each motion=control parameter when the EOM is
in acceleration format. The relative importance of each motion=control para-
meter to the overall response of the aircraft can be assessed from the relative
magnitude of its respective stability parameter. The units of a stability para-
meter are acceleration (linear or angular) per the appropriate units of the
motion=control parameter. For example, X u represents the linear acceleration
along the x axis per unit of the perturbed x axis velocity u. The appropriate
units for X u are ft=s 2=ft=s or s1 . Finally, notice that we will be dropping the
hat on the perturbed variables ^aa and ^dde from this point on for simplicity. The
reader should keep in mind that whenever we are dealing with the linearized
EOM, the motion=control parameters always represent perturbed quantities.
A similar approach will be taken with the z force equation of Eq. (6.126).
ð _ww  U1qÞ ¼ gy sin Y1  qq1S
mU1
ðCL u þ 2CL1 Þ
|fflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflffl}
Z u
u  qq1S
m ðCL^aa þ CD1 Þ
|fflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflffl}
Za
^aa
 qq1S cc
2mU1
C L_aa _aa
|fflfflfflfflfflfflffl{zfflfflfflfflfflfflffl}
Z_aa
 qq1S cc
2mU1
C L q
|fflfflfflfflfflffl{zfflfflfflfflfflffl}
Z q
q  qq1S
m C L^dde	
|fflfflfflffl{zfflfflfflffl}
Zde
^dde
Notice that the cc=2U1 term used to nondimensionalize _aa and q has been
combined into the stability parameters Z_aa and Z q. As an example, Z q represents
the linear acceleration along the z axis per unit of the perturbed variable q. It
has units of ft=s 2=rad=s or simply ft=s.
LINEARIZING THE EQUATIONS OF MOTION 	287

-- 303 of 650 --

Finally, we will incorporate stability parameters into the pitching moment
equation of Eq. (6.126).
_qq ¼ qq1S cc
I yy U1
ðC mu þ 2Cm1 Þ
|fflfflfflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl}
Mu
u þ qq1S cc
I yy U1
ðC mTu
þ 2C mT1
Þ
|fflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl}
MTu
u
þ qq1S cc
I yy
Cm^aa
|fflfflfflfflffl{zfflfflfflfflffl}
Ma
^aa þ qq1S cc
I yy
C mT^aa
|fflfflfflfflfflffl{zfflfflfflfflfflffl}
MTa
^aa þ qq1S cc2
2I yy U1
Cm_aa
|fflfflfflfflfflffl{zfflfflfflfflfflffl}
M_aa
_aa
þ qq1S cc2
2I yy U1
Cm q
|fflfflfflfflfflffl{zfflfflfflfflfflffl}
Mq
q þ qq1S cc
I yy
C m^dde
|fflfflfflfflffl{zfflfflfflfflffl}
Mde
^dde
Using the example of the Ma stability parameter, it represents the pitch angular
acceleration per unit of the perturbed variable ^aa. It has units of rad=s 2=rad or
simply s2 . Equation (6.126) may now be recast using stability parameters:
_uu ¼ gy cos Y1 þ X u u þ XT u u þ Xa a þ Xde
^dde
_ww  U1q ¼ gy sin Y1 þ Zu u þ Za a þ Z_aa _aa þ Z q q þ Zde
^dde 	ð6:127Þ
_qq ¼ M u u þ M T u u þ Ma a þ M Ta a þ M_aa _aa þ M q q þ Mde
^dde
Table 6.3 summaries the longitudinal stability parameters associated with Eq.
(6.127).
6.5.3 	Lateral-Directional EOM
For the lateral-directional EOM, we begin with Eq. (6.7) and substitute in
Eq. (6.96) for the perturbed aero forces and moments, and Eq. (6.124) for the
perturbed thrust forces and moments. In addition, we neglect derivatives that
typically have negligible values. This results in
I xx _pp  Ixz _rr ¼ qq1Sb C lb b þ C lp
pb
2U1
þ Clr
rb
2U1
þ Clda
^dda þ C ldr
^ddr
 	
mð_vv þ U1rÞ ¼ mgf cos Y1 þ qq1S Cyb b þ Cy p
pb
2U1
þ Cy r
rb
2U1
þ C yda
^dda þ C ydr
^ddr
 	
I zz _rr  I xz _pp ¼ qq1Sb C nb b þ C nTb
b þ Cn p
pb
2U1
þ Cn r
rb
2U1
þ Cnda
^dda þ Cndr
^ddr
 	
ð6:128Þ
Next, the y force equation of Eq. (6.128) is divided by the mass (m) and
grouped first, while the rolling moment and yawing moment equations of Eq.
288 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 304 of 650 --

Table 6.3 	Longitudinal stability parameters
Stability parameter 	Definition 	Units
X u 	 qq1S
mU1
ðCD u þ 2CD l Þ ft=s 2
ft=s ¼ s1
X Tu
qq1S
mU1
ðCTxu
þ 2CTxl
Þ ft=s 2
ft=s ¼ s1
Xa 	þ qql S
m ðCD^aa þ CL l Þ ft=s 2
rad ¼ ft=s 2
Xde 	 qq1S
m C D^dde
ft=s 2
rad ¼ ft=s 2
Z u 	 qq1S
mU1
ðCL u þ 2CLl Þ ft=s 2
ft=s ¼ s1
Za 	 qq1S
m ðC L^aa þ 2C Dl Þ ft=s 2
rad ¼ ft=s 2
Z_aa 	 qq1S cc
2mU1
C L_aa
ft=s 2
rad=s ¼ ft=s
Z q 	 qq1S cc
2mU1
C Lq
ft=s 2
rad=s ¼ ft=s
Zde 	 qq1S
m C L^dde
ft=s 2
rad ¼ ft=s 2
M u
qq1S cc
I yy U1
ðC mu þ 2C m1 Þ rad=s 2
ft=s ¼ 1=ðft  sÞ
M Tu
qq1S cc
I yy U1
ðCm Tu
þ 2C mT1
Þ rad=s 2
ft=s ¼ 1=ðft  sÞ
Ma
qq1S cc
I yy
C m^aa
rad=s 2
rad ¼ s2
M Ta
qq1S cc
I yy
C mT^aa
rad=s 2
rad=s ¼ s1
M_aa
qq1S cc2
2I yy U1
C m_aa
rad=s 2
rad=s ¼ s1
M q
qq1S cc2
2I yy U1
C mq
rad=s 2
rad=s ¼ s1
Mde
qq1S cc
I yy
Cm^dde
rad=s 2
rad ¼ s2
LINEARIZING THE EQUATIONS OF MOTION 	289

-- 305 of 650 --

(6.128) are divided by I xx and I zz, respectively, and presented second and third.
This results in
ð_vv þ U1rÞ ¼ gf cos Y1 þ qq1S
m C yb b þ Cy p
pb
2U1
þ Cy r
rb
2U1
þ C yda
^dda þ C ydr
^ddr
 	
_pp  Ixz
I xx
_rr ¼ qq1Sb
I xx
Clb b þ Cl p
pb
2U1
þ C lr
rb
2U1
þ C lda
^dda þ Cldr
^ddr
 	
ð6:129Þ
_rr  I xz
I zz
_pp ¼ qq1Sb
I zz
Cnb b þ C nTb
b þ Cn p
pb
2U1
þ C nr
rb
2U1
þ Cnda
^dda þ C ndr
^ddr
 	
This results in each term on the right-hand side of Eq. (6.129) having units of
linear or angular acceleration.
Because the EOM have been developed in the body-fixed stability axis
system (see Sec. 6.2), the two moments of inertia, I xx and I zz, and the one
product of inertia, I xz, must be calculated in that system. In most cases, these
inertias are calculated in the body axis system so a transformation through the
steady-state angle of attack, a1 , is required. This transformation is presented in
Eq. (6.130) and is from Ref. 1.
I xx
I zz
I xz
2
4
3
5
Stability
¼
cos 2 a1 	sin 2 a1 	 sin 2a1
sin 2 a1 	cos 2 a1 	sin 2a1
0:5 sin 2a1 	0:5 sin 2a1 	cos 2 a1
2
4
3
5 I xx
I zz
I xz
2
4
3
5
Body
ð6:130Þ
A transformation is not needed for the longitudinal case involving I yy because
I yyStability ¼ I yyBody .
6.5.4 	Lateral-Directional Stability Parameters
To simplify Eq. (6.129) and to gain understanding of the relative contribu-
tions of each term in these equations, we again use the concept of stability
parameters or dimensional stability derivatives. Again, stability parameters
represent the linear or angular acceleration per motion or control variable (b, p,
r, da, and dr) for each term in the right-hand side of Eq. (6.129). We first
rewrite the y force equation of Eq. (6.129):
ð_vv þ U1rÞ ¼ gf cos Y1 þ qq1S
m C yb
|fflfflffl{zfflfflffl}
Yb
b þ qq1Sb
2mU1
Cy p
|fflfflfflfflffl{zfflfflfflfflffl}
Y p
p þ qq1Sb
2mU1
Cy r
|fflfflfflfflffl{zfflfflfflfflffl}
Y r
r þ qq1S
m Cyda
|fflfflfflffl{zfflfflfflffl}
Yda
^dda
þ qq1S
m C ydr
|fflfflfflffl{zfflfflfflffl}
Ydr
^ddr
The stability parameters Yb, Y p, Y r, Yda , and Ydr are again simply a grouping of
the terms multiplying each motion=control parameter when the EOM is in
acceleration format. Notice that the b=2U1 term used to nondimensionalize p
290 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 306 of 650 --

and r has been combined into the stability parameters Y p and Yr. A similar
approach will be taken with the rolling moment equation of Eq. (6.129).
_pp  I xz
I xx
_rr ¼ qq1Sb
I xx
C lb
|fflfflfflffl{zfflfflfflffl}
Lb
b þ qq1Sb2
2I xx U1
C lp
|fflfflfflfflfflffl{zfflfflfflfflfflffl}
L p
p þ qq1Sb2
2I xx U1
Clr
|fflfflfflfflfflffl{zfflfflfflfflfflffl}
L r
r þ qq1Sb
Ixx
Clda
|fflfflfflfflffl{zfflfflfflfflffl}
Lda
^dda þ qq1Sb
I xx
C ldr
|fflfflfflfflffl{zfflfflfflfflffl}
Ldr
^ddr
Finally, we will incorporate stability parameters into the yawing moment equa-
tion of Eq. (6.129).
_rr  I xz
I xx
_pp ¼ qq1Sb
I zz
Cnb
|fflfflfflfflffl{zfflfflfflfflffl}
Nb
b þ qq1Sb
I zz
Cn Tb
|fflfflfflfflffl{zfflfflfflfflffl}
N Tb
b þ qq1Sb2
2I zz U1
Cn p
|fflfflfflfflfflffl{zfflfflfflfflfflffl}
N p
p þ qq1Sb2
2I zz U1
C nr
|fflfflfflfflfflffl{zfflfflfflfflfflffl}
N r
r þ qq1Sb
I zz
Cnda
|fflfflfflfflffl{zfflfflfflfflffl}
Nda
^dda
þ qq1Sb
I zz
Cndr
|fflfflfflfflffl{zfflfflfflfflffl}
Ndr
^ddr
Equation (6.129) may now be recast using stability parameters:
_vv þ U1r ¼ gf cos Y1 þ Yb b þ Yp p þ Yr r þ Yda
^dda þ Ydr
^ddr
_pp  I xz
I xx
_rr ¼ Lb b þ Lp p þ L r r þ Lda
^dda þ Ldr
^ddr 	ð6:131Þ
_rr  I xz
I zz
_pp ¼ Nb b þ NTb b þ N r r þ Nda
^dda þ Ndr
^ddr
Table 6.4 summarizes the lateral-directional stability parameters associated with
Eq. (6.131).
6.6 	Historical Snapshot—The X-38 Parafoil Cavity Investigation
Another wind tunnel evaluation conducted at the U.S. Air Force Academy
supported development of the X-38 and investigated the stability characteristics
associated with a variety of parafoil cavity configurations. 2 The parafoil cavity
study compared the stability characteristics of the clean ‘‘hatch on’’ configura-
tion to that of four different parafoil cavity shapes representing the ‘‘hatch off’’
configuration. The parafoil cavity was located on the upper body of the X-38.
Figure 6.16 illustrates the geometry of the four cavity configurations. Each
cavity consisted of different geometry. The baseline hatch on configuration was
denoted C1, and the four cavity configurations were denoted C2 through C5.
C2 was a shallow cavity aft of the docking ring with deeper indentations
closer to the fin region. C3 was similar to C2 but did not extend as close to
the fin area. C4 was the smallest cavity and was concentrated toward the aft
body, further away from the docking ring, and away from the fins. C5 was the
deepest cavity with indentations close to the fins.
LINEARIZING THE EQUATIONS OF MOTION 	291

-- 307 of 650 --

Table 6.4 	Lateral-directional stability parameters
Stability parameter 	Definition 	Units
Yb
qq1S
m Cyb
ft=s 2
rad ¼ ft=s 2
Y p
qq1Sb
2mU1
C yp
ft=s 2
rad=s ¼ ft=s
Y r
qq1Sb
2mU1
Cy r
ft=s 2
rad=s ¼ ft=s
Yda
qq1S
m Cyda
ft=s 2
rad ¼ ft=s 2
Ydr
qq1S
m Cydr
ft=s 2
rad ¼ ft=s 2
Lb
qq1Sb
I xx
Clb
rad=s 2
rad ¼ s2
L p
qq1Sb2
2Ixx U1
Cl p
rad=s 2
rad=s ¼ s1
L r
qq1Sb2
2Ixx U1
Cl r
rad=s 2
rad=s ¼ s1
Lda
qq1Sb
I xx
Clda
rad=s 2
rad ¼ s2
Ldr
qq1Sb
I xx
C ldr
rad=s 2
rad ¼ s2
Nb
qq1Sb
I zz
Cnb
rad=s 2
rad ¼ s2
N Tb
qq1Sb
I zz
Cn Tb
rad=s 2
rad ¼ s2
N p
qq1Sb2
2Izz U1
C np
rad=s 2
rad=s ¼ s1
N r
qq1Sb2
2Izz U1
C nr
rad=s 2
rad=s ¼ s1
Nda
qq1Sb
I zz
Cnda
rad=s 2
rad ¼ s2
Ndr
qq1Sb
I zz
Cndr
rad=s 2
rad ¼ s2
292 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 308 of 650 --

Longitudinal stability characteristics (C ma ) of the various cavity configura-
tions were investigated by plotting pitching moment coefficient vs angle of
attack. Figure 6.17 illustrates this for all configurations at Mach 0.55. In
comparing the five configurations, it can be observed that the slope of the line,
and thus the value of C ma , is relatively constant. The primary difference found
was in the trim angle of attack, which decreased in order from approximately
13 deg for the baseline hatch on configuration (C1) to 12 deg for C5. This was
probably a result of flow disruption from the cavity reducing the effectiveness
of the aft body ramp. The aft body ramp on top of the X-38 body is intended
to provide a positive contribution to pitching moment, an effect that appears to
be reduced by flow interference from the cavity. The data also indicated that
the vehicles will experience a drop in angle of attack as the hatch cover is
deployed.
The lateral stability characteristics of the various cavity configurations were
investigated and compared to the hatch on configuration by graphing rolling
Fig. 6.16 	Parafoil cavity shapes for the 4.5% scale X-38 wind tunnel model.
Fig. 6.17 	Pitching moment coefficient vs alpha for all configurations, at 0 deg
sideslip angle.
LINEARIZING THE EQUATIONS OF MOTION 	293

-- 309 of 650 --

moment coefficient as a function of sideslip angle and finding the slope of the
line (C lb ). The stability derivative C lb was determined over a range of angles of
attack.
Figure 6.18 presents a graph of C lb as a function of angle of attack for all
configurations, and shows the increased lateral stability with increasing angle
of attack. However, after 16 deg angle of attack, the lateral stability began to
decrease.
In comparing C lb for the four configurations and the baseline hatch on
configuration, it can be observed that C5 was less stable than the other four in
the 10 to 16 deg angle of attack region. The increase in lateral stability with
angles of attack below 16 deg was theorized to be a result of accelerated flow
being channeled into the valley between the X-38 body and vertical fin. Typical
values of C lb for various aircraft are shown in Table 6.5. Compared to an aver-
age value of C lb of 7 0.0037=deg for the X-38, the first three aircraft appear
to be slightly less laterally stable than the X-38.
Another important parameter in analyzing X-38 lateral-directional character-
istics was the directional stability derivative, Cnb . To determine Cnb , C n was
graphed as a function of sideslip angle at various angles of attack. Figure 6.19
presents the summary plot of C nb vs angle of attack for the five configurations.
Cnb appeared to be the same for all configurations at 0 deg angle of attack,
then decrease as angle of attack increased to 4 deg. The behavior of C nb in the
Fig. 6.18 	Clb vs angle of attack for all configurations.
Table 6.5 	Typical Clb values for various aircraft
(Ref. 1)
Aircraft 	Cruise, C lb 	Approach, C lb
Small Cessna 	 0.00161 	 0.00169
T-37 	 0.00165 	 0.00143
F-4 	 0.0014 	 0.0027
B-747 	 0.0166 	 0.0049
294 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 310 of 650 --

low angle of attack region was considered to be of more academic interest than
practical interest because the X-38 flight angle of attack range was generally
above 12 deg. C nb increased from 4 to 16 deg angle of attack, but beyond that
point the derivative decreased. The drop in C nb reaching 20 deg may be
because of a flow separation region masking a portion of the vertical fin at
high angles of attack.
Comparing the five parafoil hatch configurations in Fig. 6.19, it can be
observed that C5 seems to be less directionally stable in the 4 to 16 deg angle
of attack range than the other four configurations. C4 provided the highest
level of directional stability up to 14 deg angle of attack, even above that of
the baseline. However, C2 and C3 tended to maintain their directional stability
longer, up to approximately 16 deg angle of attack. C4 had a deeper cavity that
was farther back on the body than any of the other cavity configurations. This
was theorized to create more drag, which acts aft of the moment reference
center and increases directional stability. C5 had a shallower cavity that
extended farther out to the side. This may have disrupted the flow over a larger
portion of the aft body ramp and possibly even the lower portion of the vertical
fins, thus reducing the directional stability. C1, C2, and C3 fell in between C4
Fig. 6.19 	Cnb as a function of angle of attack at Mach ¼ 0.55.
Table 6.6 	Typical C nb values for various aircraft
Aircraft 	Cruise, Cnb 	Approach, Cnb
Small Cessna 	0.001025 	0.00122
T-37 	0.00193 	0.0019
F-4 	0.00218 	0.0035
B-747 	0.00367 	0.00321
LINEARIZING THE EQUATIONS OF MOTION 	295

-- 311 of 650 --

and C5. Typical values of C nb for various aircraft are shown in Table 6.6.
Compared to an average value of Cnb of 0.001=deg for the X-38, these aircraft
appear to be slightly more directionally stable than the X-38. In general, the
aircraft comparison presented in Tables 6.5 and 6.6 indicate that the X-38 had
higher roll stability and lower directional stability than the aircraft chosen for
comparison. This may indicate degraded dutch roll characteristics (discussed in
Chapter 7) for the X-38 when using these aircraft as a baseline.
Overall, cavity configuration C4 was considered the best of the four config-
urations evaluated because it had slightly higher directional stability. This
shape had a smaller cavity size, and was located more toward the rear of the
body, with the majority of the cavity away from the vertical fins. This was also
the cavity configuration incorporated into the X-38 design.
References
1 Schmidt, L. V., Introduction to Aircraft Flight Dynamics, AIAA Education Series,
AIAA, Reston, Virginia, 1998.
2 Johnston, C. N., Nettleblad, T. A., and Yechout, T. R., ‘‘X-38 Mid-Rudder Feasibility
and Parafoil Cavity Investigations,’’ U.S. Air Force Academy Dept. of Aeronautics TR 01-
02, Sept. 2001.
Problems
6.1. 	Using vector mathematics, derive the expression for inertial acceleration
as measured in the rotating body axis system starting with
VVB ¼
U
V
W
2
4
3
5
B
and 	o	o ¼
P
Q
R
2
4
3
5
B
6.2 	A T-37 is in a level turn. Sensors on the aircraft measure the following
accelerations and rates:
U ¼ 200 ft=s 	_U	U ¼ 5 ft=s 2 	P ¼ 0 rad=s
V ¼ 0 ft=s 	_VV ¼ 0 ft=s 2 	Q ¼ 0:1 rad=s
W ¼ 10 ft=s 	_W	W ¼ 0 ft=s 2 	R ¼ 0:1 rad=s
Find the T-37’s inertial acceleration vector in the body axis.
296 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 312 of 650 --

6.3 	An A-37 is loaded with two 500-lb bombs as shown. The distances of
the bombs from the aircraft center of gravity are shown.
What happens to I xx if both bombs are dropped? What is the value of the
change in I xx?
6.4 	In Problem 6.3, what is the value of I yz of the aircraft after the bomb on
the right wing is dropped?
6.5 	Given
U
V
W
2
4
3
5 ¼
200
0
10
2
4
3
5 ft=s
in the body axis system with
F ¼ 25 deg
Y ¼ 10 deg
C ¼ 0 deg
(a) 	Find velocity components in earth axis system
(b) 	Show that this can be transformed back into the body axis system
6.6 	Given
_F	F ¼ 100 deg=s 	F ¼ 45 deg
_C	C ¼ 10 deg=s 	C ¼ 360 deg
_Y	Y ¼ 10 deg=s 	Y ¼ 5 deg
Find the body axis roll, pitch, and yaw rates using the kinematic equa-
tions.
LINEARIZING THE EQUATIONS OF MOTION 	297

-- 313 of 650 --

6.7 	Given the following nonlinear differential that represents some fictitious
EOM for a vehicle
_AA þ BU ¼ X
Linearize the equation using the perturbed form of the EOM and the
same steps and assumptions used to develop the real aircraft EOM.
6.8 	You would expect the term Zh to be
(a) 	Equal to one.
(b) 	Greater than one.
(c) 	Less than one.
(d) 	Approximately zero—at least a very small number.
6.9 	Which of the following terms is not part of the horizontal tail volume
coefficient?
(a) 	wing area
(b) 	tail area
(c) 	tail MAC
(d) 	tail moment arm
(e) 	dynamic pressure ratio
(f) 	tail lift curve slope
(g) 	wing lift curve slope
6.10 The tail sees the same AOA as the wing-body except for
(a) 	Nothing—they see the same AOA.
(b) 	Upwash and the tail incidence angle.
(c) 	Tail incidence angle.
(d) 	Tail incidence angle and downwash.
6.11 The elevator effectiveness term describes
(a) 	The effective change in aircraft AOA for a change in elevator deflec-
tion.
(b) 	The effective change in wing-body AOA for a change in elevator
deflection.
(c) 	The effective change in horizontal tail AOA for a change in elevator
deflection.
(d) 	None of the above.
6.12 If you saw the following expression for C m0
Cm0 ¼ Cm ACwf
þ C Lah
Zh VVh½e0 þ i h
You could assume that the aircraft
(a) 	Has a fixed tail incidence such as found on the T-41.
(b) 	Has a variable tail incidence like the B-1.
298 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 314 of 650 --

(c) 	Has a canard.
(d) 	None of the above.
6.13 The following is required for an aircraft to be stable and trimmed in 1-g
flight:
(a) 	negative (C m0 þ Cm ih
i h) and positive C ma
(b) 	positive (Cm0 þ C mih
i h) and positive C ma
(c) 	positive (Cm0 þ C mih
i h) and negative C ma
(d) 	negative (Cm0 þ Cm ih
i h) and negative C ma
6.14 How would a flying wing achieve the correct answer to Problem 6.13?
6.15 Given the following graph for a conventional aircraft, which of the
following describes the relationship between line 1 and line 2?
(a) 	Line 1 is for a more positive elevator deflection than line 2.
(b) 	Line 2 is for a more positive elevator deflection than line 1.
(c) 	The center of gravity is farther aft for line 2 than line 1.
(d) 	The center of gravity is farther aft for line 1 than line 2.
6.16 The neutral point location is almost always aft of the wing body a.c. (that
is, the aircraft is unstable in pitch without the horizontal tail).
(a) 	True
(b) 	False
6.17 Increasing the tail volume would move the neutral point:
(a) 	farther forward.
(b) 	farther aft.
(c) 	need more information to tell.
(d) 	wouldn’t change location.
6.18 Increasing elevator control power
(a) 	decreases the amount of elevator required to trim.
(b) 	increases the amount of elevator required to trim.
(c) 	has no effect on elevator required to trim.
(d) 	would only affect the stability level of the aircraft.
LINEARIZING THE EQUATIONS OF MOTION 	299

-- 315 of 650 --

6.19 An aircraft has a lift curve slope of 0.10=deg and a C ma ¼ 0:04=deg.
What is the aircraft’s static margin?
6.20 An aircraft has longitudinal static stability at a given center of gravity
location. Which of the following is true?
(a) 	the static margin is negative
(b) 	@de=@CL ¼ 0
(c) 	C ma < 0
(d) 	all of the above
6.21 Assume a Lear Jet is cruising (level, unaccelerated flight) at 40,000 ft
with U1 ¼ 677 ft=s, S ¼ 230 ft 2 , Weight ¼ 13,000 lb, and CT x1
¼ 0:0335.
Find CL1 and C D1 .
6.22 Compute the thrust being produced by the Lear Jet in Problem 6.21.
6.23 Given f ðxÞ ¼ f ðaÞ þ f 0 ðaÞðx  aÞ and f ðzÞ ¼ 0:1x4  0:15x3  0:5x2
0:25x þ 1:2
Use the first-order Taylor series approximation to evaluate f ðxÞ given
f ðaÞ where:
a ¼ 1
x ¼ 2
6.24 Compare the answer from Problem 6.23 with what you would obtain just
evaluating f ðaÞ at a ¼ 2.
6.25 To obtain the same answer for Problems 6.23 and 6.24, what order
Taylor series would you use? Try it.
6.26 For each of the following terms, indicate if the term is important,
approximately zero, or too small to worry about:
Clb ; C lda
; C y p ; C yb ; C nb C Dq ; C Da ; C Du ; C ma ; C y r ; C yda
6.27 Which of the following is called a cross derivative?
(a) 	Cma 	(b) 	C lp 	(c) 	C n p 	(d) 	C nr
6.28 Write down the normal sign one would expect to see for each of the
following:
(a) 	Cl p
(b) 	Cm q
(c) 	C l r
(d) 	Cn r
300 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 316 of 650 --

6.29 Which of the following plays the most significant role in lateral-direc-
tional dynamics?
(a) 	Cn p
(b) 	Cl r
(c) 	C n r
(d) 	Cma
6.30 Most of the contribution (80 to 90%) to Cn r comes from which compo-
nent of the aircraft?
6.31 Normally, you would expect a fighter to have a higher or lower Clp than
a glider?
6.32 Which of the following provides the largest contribution to C lp ?
(a) 	wing
(b) 	horizontal tail
(c) 	vertical tail
(d) 	fuselage
6.33 When nondimensionalizing the lateral-directional stability derivatives, the
characteristic length used is
(a) 	the MAC
(b) 	the wingspan
(c) 	Zvs
(d) 	None of the above
6.34 Which of the following represent a nondimensional stability derivative?
(a) 	C m q ¼ @Cm
@q
(b) 	Cm q ¼ @Cm
@ qcc
2U1
 	
(c) 	Cm^qq ¼ @Cm
@ qcc
2U1
 	
(d) 	All of the options are dimensional stability derivatives.
6.35 An F-4 is cruising at 35,000 ft at a velocity of 876 ft=s (density is
0:000739 slug=ft 3 ). You are given
C L1 ¼ 0:26 	S ¼ 503 ft2
C D1 ¼ 0:03 	W ¼ 39; 000 lb
C Du ¼ 0:027
LINEARIZING THE EQUATIONS OF MOTION 	301

-- 317 of 650 --

Calculate:
(a) @FA x
@ u
U1
 	
(b) 	The stability parameter Xu
(c) 	The contribution to _uu because of X u, if u ¼ 2 ft=s.
6.36 Derive @F Ax =@a ¼ ðC Da þ CL1 Þqq1S.
6.37 Using Eq. (6.127) for the following aircraft, find _uu for a positive 1-deg
step elevator input at t ¼ 0.
Xde ¼ 12:3976 ft=s 2; XT u ¼ 0:0123 1=s; X u ¼ 0:0085 1=s;
Xa ¼ 4:9591 ft=s 2; U1 ¼ 876 ft=s
(Hint: y ¼ u ¼ a ¼ 0 at t ¼ 0)
At t ¼ 1, estimate U (the new stabilized velocity) if a ¼ 0:1 deg
and y ¼ 0:15 deg.
302 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 318 of 650 --

7
Aircraft Dynamic Stability
Aircraft dynamic stability focuses on the time history of aircraft motion
after the aircraft is disturbed from an equilibrium or trim condition. This
motion may be first order (exponential response) or second order (oscillatory
response), and will have either positive dynamic stability (aircraft returns to the
trim condition as time goes to infinity), neutral dynamic stability (aircraft
neither returns to trim nor diverges further from the disturbed condition), or
dynamic instability (aircraft diverges from the trim condition and the disturbed
condition as time goes to infinity). The study of dynamic stability is important
to understanding aircraft handling qualities and the design features that make
an airplane fly well or not as well while performing specific mission tasks. The
differential equations that define the aircraft equations of motion (EOM) form
the starting point for the study of dynamic stability.
7.1 	Mass–Spring–Damper System and Classical Solutions of
Ordinary Differential Equations
The mass–spring–damper system illustrated in Fig. 7.1 provides a starting
point for analysis of system dynamics and aircraft dynamic stability. This is an
excellent model to begin the understanding of dynamic response.
We will first develop an expression for the sum of forces in the vertical
direction. Notice that xðtÞ is defined as positive for an upward displacement
and that the zero position is chosen as the point where the system is initially at
303
Fig. 7.1 	Mass–spring–damper system.

-- 319 of 650 --

rest or at equilibrium. We know that
P Fx ¼ m d 2x
dt2 	ð7:1Þ
There are two forces acting on the mass, the damping force, and the spring
force. For the damping or frictional force (Ff ), this can be approximated by a
linear relationship of damping force as a function of velocity or dx=dt (see Fig.
7.2).
A damper can be thought of as a ‘‘shock absorber’’ with a piston moving
up and down inside a cylinder. The piston is immersed in a fluid and the fluid
is displaced through a small orifice to provide a resistance force directly
proportional to the velocity of the piston. This resistance force (Ff ) can be
expressed as
F f ¼ CV
where C is the slope in Fig. 7.2. The spring force (F s) is directly proportional
to the displacement (x) of the mass and can be represented as
Fs ¼ Kx
where K is the spring constant. If the mass is displaced in the positive x direc-
tion, both the damping and spring forces act in a direction opposite to this
displacement and can be represented by
Ff þ Fs ¼ CV  Kx 	ð7:2Þ
Because
V ¼ dx
dt ð7:3Þ
Fig. 7.2 	Damper relationship.
304 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 320 of 650 --

we can combine Eqs. (7.1–7.3) to obtain
m d 2x
dt2
 	
¼ C dx
dt
 	
 Kx
or
m d 2x
dt2
 	
þ C dx
dt
 	
þ Kx ¼ 0 	ð7:4Þ
which is the differential equation for the mass–spring–damper system with
zero initial displacement (x ¼ 0).
If we initially stretch the spring from its original position by a distance y as
shown in Fig. 7.3, we build in a forcing function that must be added to Eq.
(7.4).
Because the upper ‘‘tie down’’ point is moved up by a distance y to achieve
this stretch or preload, the preload has a positive sign and a magnitude of Ky.
It can be conveniently added to the right side of Eq. (7.4) to obtain
m d 2x
dt2
 	
þ C dx
dt
 	
þ Kx ¼ Ky 	ð7:5Þ
This is the differential equation for the spring–mass–damper system with a
preload as shown. At this point, we should observe that if the mass is free to
move, it will obtain a steady-state condition (a new equilibrium location) when
d2x=dt2 and dx=dt equal zero; and the new equilibrium position will be x ¼ y.
Now that the differential equation for the spring–mass–damper system has
been defined, we will review classical approaches to solving ordinary differen-
tial equations of this type. Keep in mind that Eq. (7.5) is also representative of
aircraft motion and that is why we are investigating it in depth.
Fig. 7.3 	Adding a forcing function to the spring–mass–damper system.
AIRCRAFT DYNAMIC STABILITY 	305

-- 321 of 650 --

7.1.1 	First-Order Systems
A special case of Eq. (7.5), which we will consider first, addresses a
spring–mass–damper system where the mass is very small or negligible
compared to the size of the spring and damper. We will call such a system a
massless or first-order (referring to the order of the highest derivative) system.
The following differential equation results when the mass is set equal to zero.
C dx
dt
 	
þ Kx ¼ Ky 	ð7:6Þ
To solve this differential equation, we will first describe the method of differen-
tial operators where P is defined as the differential operator, d=dt, so that
Px ¼ dx
dt P2x ¼ d 2x
dt2
x
P ¼
ð
x dt
We will first attack the homogeneous form (forcing function equal to zero) of
Eq. (7.6),
C dx
dt
 	
þ Kx ¼ 0 	ð7:7Þ
Substituting in the differential operator, P, Eq. (7.7) becomes
CPx þ Kx ¼ 0
We then solve for P, which now becomes a root of the equation,
ðCP þ KÞx ¼ 0
P ¼ ðK=CÞ
The homogeneous solution is then of the form
xðtÞ ¼ C1e Pt ¼ C1eðK=CÞt 	ð7:8Þ
where C1 is determined from initial conditions. The homogeneous solution will
also be called the transient solution when we are dealing with aircraft
response.
Example 7.1
Solve the following first-order differential equation
dx
dt þ 2x ¼ 0
subject to the following initial condition: xð0Þ ¼ 1
306 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 322 of 650 --

Solution:
Px þ 2x ¼ 0
ðP þ 2Þx ¼ 0
P ¼ 2
xðtÞ ¼ C1e2t
Using the initial condition xð0Þ ¼ 1 to evaluate C1
1 ¼ C1
and
xðtÞ ¼ e2t
is the solution, or time response.
The solution is graphed in Fig. 7.4. Notice that it starts off at a value of one
at time equal to zero and exponentially decays to zero. It is also important to
note that a first-order system has a first order or exponential transient response
(no oscillations).
Next, we will look at solving a first-order nonhomogeneous differential
equation like Eq. (7.6). A forcing function is included with a nonhomogeneous
differential equation and the solution is called the nonhomogeneous or partic-
ular solution. It is also called the steady-state solution when we are dealing
with aircraft response. To achieve a solution using differential operators, we
must assume a form of the solution based on the form of the forcing function
as outlined in Table 7.1.
The first step in solving a nonhomogeneous differential equation involves
setting the forcing function to zero and obtaining the homogeneous solution.
Next, the appropriate assumed solution is input into the nonhomogeneous
differential equation so that the constants A, B, C, (as appropriate) can be de-
termined and the nonhomogeneous solution defined. Finally, the homogeneous
and nonhomogeneous are added together to obtain the total solution. Example
7.2 will help clarify these steps.
Fig. 7.4 	Transient time response of a first-order differential equation.
AIRCRAFT DYNAMIC STABILITY 	307

-- 323 of 650 --

Example 7.2
Solve the following first-order differential equation:
2 dx
dt þ 3x ¼ 6
subject to the following initial condition: xð0Þ ¼ 0
Homogeneous (Transient) Solution:
2Px þ 3x ¼ 0
ð2P þ 3Þx ¼ 0
P ¼ 3=2
xhðtÞ ¼ C1eð3=2Þt
ðHomogeneous SolutionÞ
Nonhomogeneous (Steady-State) Solution:
Assume a steady-state solution of the form xðtÞ ¼ A because the forcing
function is a constant.
Substitute x nhðtÞ ¼ A into the original differential equation:
2ð0Þ þ 3A ¼ 6
A ¼ 2
And the nonhomogeneous solution is:
xnhðtÞ ¼ 2
The forcing function should be thought of as a constant equal to 2 with the 6
on the right-hand side of the differential equation being equal to the spring
constant (K ¼ 3) times the forcing function.
The total solution is the combination of the homogeneous and nonhomo-
geneous solutions:
xðtÞ ¼ x hðtÞ þ x nhðtÞ ¼ C1eð3=2Þt þ 2
Table 7.1 	Assumed solutions for nonhomogeneous
differential equations
Forcing function 	Assumed solution
K 	A
Kt 	At þ B
Kt2 	At2 þ Bt þ C
K sin wt 	A sin wt þ B cos wt
308 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 324 of 650 --

To evaluate the constant C1 , we use the initial condition xð0Þ ¼ 0
0 ¼ C1 þ 2
C1 ¼ 2
and
xðtÞ ¼ 2eð3=2Þt þ 2
or
xðtÞ ¼ 2ð1  eð3=2Þt Þ
becomes the total solution.
Example 7.2 yields some interesting insights. Evaluating the total solution
at t ¼ 0 results in xðtÞ ¼ 0 which agrees with our initial condition. At t ¼ 1,
the exponential term goes to zero and xð1Þ ¼ 2, which is the same as the
value of the constant forcing function. The time response for Example 7.2 is
presented in Fig. 7.5.
7.1.1.1 	Time constant. 	We will next introduce the important concept of
Time Constant (t). If we return to Eq. (7.6) and solve it in general form for an
initial condition of xð0Þ ¼ 0, we obtain
xðtÞ ¼ yð1  eðK=CÞt Þ
Figure 7.6 presents a graph of the time response. Notice that the steady-state
value is y, which equates to the value of the displacement of the forcing func-
tion.
We will begin referring to a constant forcing function as a step input.
Notice also the exponential rise to achieve the steady-state value. The lag time
associated with this rise to the steady-state value is an important consideration
in determining the acceptability of the response from an aircraft handling quali-
ties standpoint. This lag time is typically quantified with the time constant (t),
Fig. 7.5 	Time response for Example 7.2.
AIRCRAFT DYNAMIC STABILITY 	309

-- 325 of 650 --

which is a measure of the time it takes to achieve 63.2% of the steady-state
value. Why did we pick 63.2%? If we let t ¼ C=K, our first-order response to
a step input becomes
xðtÞ ¼ yð1  eðK=CÞðC=KÞ Þ ¼ yð1  e1Þ ¼ yð1  0:368Þ
xðtÞ ¼ 0:632y 	ðat t ¼ C=K ¼ tÞ
The time constant becomes an easy value to determine because
t ¼  1
P ð7:9Þ
for a first-order differential equation. In the case of Example 7.2, t is equal to
2=3 s. Note also, because t is equal to C=K for the spring–mass–damper
system, that t will increase (meaning a slower responding system) for an
increase in damping constant (C), and that t will decrease (meaning a faster
responding system) for an increase in the spring constant (K). This should
make sense when thinking about the physical dynamics of the system.
7.1.1.2 	Time to half and double amplitude. 	Another measure of the lag
time associated with a systems response is the time to half amplitude (T1=2 ).
Referring to Fig. 7.6, this is simply the time it takes to achieve 50% of the steady-
state value. It can be easily shown that
T1=2 ¼ tðln 2Þ ¼ 0:693t 	ð7:10Þ
For unstable first order systems (P > 0), a measure used as an indication of
the instability is the time to double amplitude (T2 ). T2 is the time it takes for
Fig. 7.6 	Generalized response of a first-order system.
310 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 326 of 650 --

the response to achieve twice the amplitude of an input disturbance. It can be
found using
T2 ¼ ln 2
P ¼ 0:693
P ð7:11Þ
7.1.2 	Second-Order Systems
We now return to Eq. (7.5) in its entirety for a spring–mass–damper system
where the mass provides significant inertial effects. Equation (7.5) is a second-
order differential equation (referring to the highest-order derivative) or simply a
second-order system. It becomes
M €xx þ C_xx þ Kx ¼ Ky
or
€xx þ C
M _xx þ K
M x ¼ K
M y 	ð7:12Þ
To solve Eq. (7.12), we will again use the method of differential operators on
the homogeneous differential equation to obtain the transient solution or transi-
ent response.
ðMP2 þ CP þ KÞx ¼ 0
We can then solve for the roots (P) of this equation using the quadratic
formula.
P1;2 ¼  C
2M 
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
C2  4KM
p
2M
Three cases must be considered based on the sign of the expression under the
radical.
Case 1: Two Real Unequal Roots or C2 > 4KM
This results in an overdamped system (no oscillations) with a general solu-
tion of the form
xðtÞ ¼ C1e P1t þ C2e P2 t 	ð7:13Þ
The constants C1 and C2 must be evaluated based on the initial conditions.
Case 2: Two Real Repeated Roots or C2 ¼ 4KM
This results in a critically damped system (no oscillations) with a general
solution of the form
xðtÞ ¼ C1e Pt þ C2te Pt 	ð7:14Þ
Again, the constants C1 and C2 must be evaluated based on initial conditions.
AIRCRAFT DYNAMIC STABILITY 	311

-- 327 of 650 --

Case 3: Two Complex Conjugate Roots or 4KM > C2
This results in an underdamped (with oscillations) system. The roots are
P1;2 ¼  C
2M  i
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
4KM  C2
p
2M ¼ a  ib
and the general solution is of the form
xðtÞ ¼ e at½C1 sin bt þ C2 cos bt
or
xðtÞ ¼ C3e at sinðbt þ fÞ 	ð7:15Þ
where
jC3j ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
C2
1 þ C2
2
q
and
f ¼ tan1 C2
C1
 	
Notice in Eq. (7.15) that the real part of the root (a) determines the exponential
decay (damping) portion of the time response and that the imaginary part of
the root (b) is the frequency of the oscillation. The phase angle (f) can be
thought of for now as a lag between an input and output. Case 3 is typical of
three dynamic modes of motion for most aircraft (the short period, the phugoid,
and the dutch roll modes), which we will discuss in detail later.
7.1.2.1 	Damping ratio and natural frequency. 	We can recast Eq. (7.12)
in terms of two new parameters: damping ratio (z) and natural frequency (oN ).
These parameters have physical meaning for Case 3 and lead directly to the time
solution for common inputs such as steps and impulses.
€xx þ 2zoN _xx þ o2
N x ¼ o2
N y 	ð7:16Þ
The damping ratio provides an indication of the system damping and will fall
between 1 and 1 for Case 3. For stable systems, the damping ratio will be
between 0 and 1. For this case, the higher the damping ratio, the more damp-
ing is present in the system. Figure 7.7 presents a family of second order
responses to a unit step (y ¼ 1) input, which show the influence of damping
ratio. Notice that the number of overshoots=undershoots varies inversely with
the damping ratio.
The natural frequency is the frequency (in rad=s) that the system would
oscillate at if there were no damping. It represents the highest frequency that
312 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 328 of 650 --

the system is capable of, but it is not the frequency that the system actually
oscillates at if damping is present. For the mass–spring–damper system,
oN ¼ ffiffiffiffiffiffiffiffiffiffiffi
K=M
p .
7.1.2.2 	Damped frequency. 	The damped frequency (oD) represents the
frequency (in rad=s) that the system actually oscillates at with damping present.
Returning to Eq. (7.16), we can use the quadratic formula to solve for the roots of
the homogeneous form of the equation.
P1;2 ¼ zoN  ioN
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
q
¼ zoN  ioD ¼ a  ib 	ð7:17Þ
where
oD ¼ oN
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
q
¼ Damped Frequency 	ð7:18Þ
7.1.2.3 	Time constant. 	The time constant (t) for a second order system
can be found by examining the real part of the roots (zon) in Eq. (7.17) and
recalling our discussion in Sec. 7.1.1.1. The time constant (t) for the generalized
Fig. 7.7 	Unit step responses for different damping ratios.
AIRCRAFT DYNAMIC STABILITY 	313

-- 329 of 650 --

case of Eq. (7.16) becomes
t ¼ 1
zoN
ð7:19Þ
This is similar to the way we computed the time constant for a first-order
system ðt ¼ 1=PÞ. Notice that the larger the zoN , the smaller t and the faster
the response.
7.1.2.4 	Period of oscillation. 	The period of oscillation (T ) for a second-
order system is the time it takes between consecutive peaks of an oscillation. The
period is inversely proportional to the damped frequency and is defined by
T ¼ 2p
oD
ð7:20Þ
where oD must be in units of radians=second.
The time response for the homogeneous case of Eq. (7.16) is
xðtÞ ¼ C3ezoN t sinðoD t þ fÞ 	ð7:21Þ
Figure 7.8 illustrates this response. The system has been initially disturbed by
an impulse input (which may be thought of as a very short duration spike
input that excites the system dynamics). The figure also illustrates several of
the concepts just discussed.
The steady-state (nonhomogeneous) solution will be defined next for Eq.
(7.16). Because the forcing function, o2
n y, is a constant we can assume the
form of the solution as
x SS ðtÞ ¼ A
Fig. 7.8 	Second-order time response.
314 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 330 of 650 --

Therefore,
d 2A
dt2 ¼ 0; dA
dt ¼ 0 ) 0 þ 0 þ o2
N x ¼ o2
N y
and
A ¼ y
We will assume a unit step input (y ¼ 1) in most cases so the particular
(steady solution) is
xSS ðtÞ ¼ 1
The total solution then becomes
xðtÞ ¼ xtransientðtÞ þ x SS ðtÞ
or
xðtÞ ¼ 1 þ C3ezoN t sinðoD t þ fÞ 	ð7:22Þ
Please note that the C3 in Eq. (7.22) will typically not have the same value as
the C3 in Eq. (7.15).
Example 7.3
Find the time solution for the following differential equation:
> €xx þ 5_xx þ 25x ¼ 25
First, we apply the generalized form for a second-order differential equation
Eq. (7.16):
€xx þ 2zoN _xx þ o2
N x ¼ o2
N y
The first thing we notice is the unit step input (y ¼ 1). Next, we can deter-
mine the values of natural frequency, damping ratio, and damped frequency:
oN ¼ ffiffiffiffiffi
25
p ¼ 5 rad=s 	2zoN ¼ 5 ) z ¼ 0:5
oD ¼ oN
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
q
¼ 4:33 rad=s
We can then input these values into the generalized solution from Eq. (7.20)
for a second-order differential equation with a unit step input:
xðtÞ ¼ 1 þ C3e2:5t sinð4:33t þ fÞ
AIRCRAFT DYNAMIC STABILITY 	315

-- 331 of 650 --

We still need to determine C3 and f, which can be evaluated from initial
conditions and a relationship that we will develop in the next section for f.
7.2 	Root Representation Using the Complex Plane
The roots of Eq. (7.16) were presented in Eq. (7.17) and are repeated here.
P1;2 ¼ zoN  ioD ¼ a  ib
These roots can be represented on a complex plane as shown in Fig. 7.9. The
complex plane plots the real part of the root on the horizontal axis and the
imaginary part of the root on the vertical axis.
From trigonometry
cos f ¼ j  zoN j
r ¼ j  zoN j
oN
¼ z
so
z ¼ cos f
or
f ¼ cos1 z 	ð7:23Þ
It is good to keep f in units of radians, as we will soon see. Also
tan f ¼ oN
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
p
j zN j ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
p
z
Fig. 7.9 	Root representation using the complex plane.
316 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 332 of 650 --

Therefore, if we know z we can find f for Eqs. (7.21) and (7.22). This leaves
only C3 to be evaluated. To do this we can assume the initial conditions of
xð0Þ ¼ _xxð0Þ ¼ 0, and use Eq. (7.22).
xð0Þ ¼ 1 þ C3ð1Þ sin f ¼ 0
to obtain
C3 ¼  1
sin f
Also, we know that
_xxðtÞ ¼ C3zoN ezoN t sinðoD t þ fÞ þ C3oD ezoN t cosðoD t þ fÞ
_xxð0Þ ¼ C3zoN sin f þ C3oD cos f ¼ 0
sin f
cos f ¼ oD
zoN
¼ oN
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
p
zoN
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
p
z ¼ tan f
This is the same result as found from the complex plane trigonometry, which
proves that the fs are the same.
Because C3 ¼ 1= sin f and sin f ¼ ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
p ,
C3 ¼  1
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
p
Therefore, for an underdamped second-order system with a step input of
magnitude y, the time response is
xðtÞ ¼ y 1  ezoN t
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
p 	sinðoD t þ fÞ
!
ð7:24Þ
This is much nicer than solving for the transient and steady-state solutions and
evaluating the constants as in Example 7.2. All we need to determine from the
original differential equation is on, z, and y. Radians are compatible units for
f in Eq. (7.24) because oD t will have units of radians. Use of Eq. (7.24) is
illustrated in Example 7.4.
AIRCRAFT DYNAMIC STABILITY 	317

-- 333 of 650 --

Example 7.4
Find the time response of the following differential equation with zero
initial conditions:
€xx þ 5_xx þ 25x ¼ 25;
oN ¼ 5 rad=s;
z ¼ 0:5;
y ¼ 1
oD ¼ 4:33 rad=s from Example 7:3
f ¼ cos1ðzÞ ¼ cos1ð0:5Þ ¼ 60 deg ¼ p
3
substituting into (Eq. 7.24) yields
xðtÞ ¼ 1  1:155e2:5t sin 4:33t þ p
3
 	
Notice the difference in effort required between Example 7.2 and 7.4.
Remember that the solution using Eq. (7.24) is for a system with 1 < z < 1
and a step input of magnitude y. If z  1 or z  1, the responses are aperio-
dic (exponential without oscillations) as discussed in Cases I and II.
The stability of a system can be determined directly from looking at the
roots of the differential equation. If the root is real and has a negative value, it
is stable [for example, P1 ¼ 2 and xðtÞ ¼ c1e2t, which decays to 0 as time
goes to infinity]. If the root is real and positive, the response is unstable
[P1 ¼ 2 ) xðtÞ ¼ C1e2t , which grows without bounds with time]. For complex
roots, it is the real part of the root that determines stability. For P1;2 ¼ a  ib,
if a < 0 the system is stable. In the form P1;2 ¼ zoN  ioD this occurs
when z > 0. If a > 0, the system is unstable, which occurs when z < 0. There-
fore, if the roots occur to the left of the imaginary axis (the left half of the
complex plane) the system is stable. Similarly, if the roots are to the right of
the imaginary axis (z ¼ 0), the system is unstable. If the roots are on the
imaginary axis (z ¼ 0), the system is neutrally stable (undamped). Time
response characteristics for an impulse input are illustrated in Fig. 7.10 for
various root locations. Notice the changes in damped frequency and time
constant.
Examples 7.5 and 7.6 further illustrate our simplified approach for solving
second-order linear differential equations. Remember that the general form of
the differential equation is
€xx þ 2zoN _xx þ o2
N x ¼ o2
N y
Depending on the value of z, the solution will be in the form of Case 1, Case
2, or Case 3.
318 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 334 of 650 --

Example 7.5
Find the time response for the following system:
€xx þ 10_xx þ 16x ¼ 32; 	xð0Þ ¼ 0; 	_xxð0Þ ¼ 0
Applying the general form of a second-order differential equation
€xx þ 2zoN _xx þ o2
N x ¼ o2
N y
we have
on ¼ ffiffiffiffiffi
16
p ¼ 4 rad=s
2zoN ¼ 10 ) 2zð4Þ ¼ 10 ) z ¼ 1:25
Because z > 1 we know that the solution is of the form of Case 1 (2 real
unequal roots). Therefore, we need to solve for the roots:
P1;2 ¼ 10  ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
10 2  4ð1Þð16Þ
p
2ð1Þ ¼ 5  3 ¼ 2; 8
Fig. 7.10 	Influence of complex plane root location on the transient response to an
impulse input.
AIRCRAFT DYNAMIC STABILITY 	319

-- 335 of 650 --

The homogeneous (transient solution) is:
xtransðtÞ ¼ C1e2t þ C2e8t
To find the steady-state solution, assume x ssðtÞ ¼ A
€AA þ
0
10 _AA þ
0
16A ¼ 32 ) A ¼ 2
We then have
xðtÞ ¼ x ssðtÞ þ xtransðtÞ ¼ 2 þ C1e2t þ C2e8t
and
xð0Þ ¼ 0 ¼ 2 þ C1 þ C2
_xxðtÞ ¼ 2C1e2t  8C2e8t
_xxð0Þ ¼ 0 ¼ 2C1  8C2 ) C1 ¼ 4C2
2  4C2 þ C2 ¼ 0 ) C2 ¼ 2
3
C1 ¼  8
3
Substituting back in, the time response becomes
xðtÞ ¼ 2  8
3 e2t þ 2
3 e8t
This response has two time constants:
t1 ¼  1
P1
¼  1
2 ¼ 0:5 s
t2 ¼  1
P2
¼  1
8 ¼ 0:125 s
Example 7.6
Find the time response for the following system:
€xx þ 5_xx þ 25x ¼ 75; 	xð0Þ ¼ 0; 	_xxð0Þ ¼ 0
!
!
320 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 336 of 650 --

Using the general form of a second-order differential equation, we have
on ¼ ffiffiffiffiffi
25
p ¼ 5 rad=s; 	y ¼ 3 because o2
n ¼ 25
2zoN ¼ 5 ) 2zð5Þ ¼ 5 ) z ¼ 0:5
oD ¼ on
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
q
¼ 5
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  ð0:5Þ2
q
¼ 4:333 rad=s
f ¼ cos1 z ¼ cos1ð0:5Þ ¼ 60 deg ¼ p
3
Because 1 < z < 1 and the input is a step input of magnitude 3 (y ¼ 3), the
solution is of the form presented in Eq. (7.24)
xðtÞ ¼ y 1  ezoN t
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
p 	sinðoD t þ fÞ
" 	#
ðCase 3Þ
Substituting in the appropriate values
xðtÞ ¼ 3 1  eð0:5Þð5Þt
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  ð0:5Þ2
q 	sin 4:333t þ p
3
 	
2
6
4
3
7
5
and the solution or time response is:
xðtÞ ¼ 3 1  1:155e2:5t sin 4:333t þ p
3
 		h 	i
Recall that the roots are
P1;2 ¼ zoN  ioD
¼ 2:5  ið4:333Þ
which could easily be plotted on the complex plane. The time constant is:
t ¼ 1
zoN
¼ 1
2:5 ¼ 0:4 s
As a reminder, if z ¼ 1 or z ¼ 1, then the solution would be of the form of
Case 2.
7.3 	Transforming the Linearized EOM to the Laplace Domain
Another common approach used in solving differential equations is that of
Laplace transforms. We will begin with a short review of Laplace transform
techniques and then apply these techniques to the six linearized differential
equations of motion for the aircraft. The differential operator, P, discussed in
Sec. 7.1.1.1, is analogous to the Laplace variable, s. The insight gained with
AIRCRAFT DYNAMIC STABILITY 	321

-- 337 of 650 --

the roots of transformed differential equations obtained using the differential
operator will directly transfer to the roots obtained with the Laplace variable, s.
7.3.1 	Laplace Transforms
It is assumed that the reader has gained familiarity with solution of differen-
tial equations using Laplace transforms from a previous course. It is the intent
of this text to simply review highlights of the Laplace method. Simply stated,
the Laplace method transforms a linear differential equation from the time
domain (the derivatives are with respect to time) into an algebraic equation in
the Laplace domain where the variable s is used. We will denote this Laplace
transform operation with the symbol L. The methods of algebra are then used
in a straightforward manner to solve for the parameter of interest. The resulting
equation is transformed back to the time domain, referred to as an inverse
Laplace transform operation and denoted with the symbol L1 so that the time
response can be obtained. By convention, small letters are used to represent
functions of time and upper case letters are used to represent their Laplace
transforms.
L½ f ðtÞ ¼ FðsÞ
and
L1½FðsÞ ¼ f ðtÞ
The Laplace transform of the derivative of a function f ðtÞ is given by
L½df ðtÞ=dt ¼ sFðsÞ  f ð0Þ
Where f ð0Þ ¼ f ðtÞ at t ¼ 0. This is commonly called an initial condition. A
second derivative is given by
L½d2f ðtÞ=dt2 ¼ s2FðsÞ  sf ð0Þ  _ff ð0Þ
Higher-order derivatives follow in a similar fashion.
7.3.1.1 	Standardized inputs. 	We will be concerned with primarily two
types of inputs or forcing functions: the unit impulse [dðtÞ] and the unit step
[1ðtÞ]. The unit impulse is defined as occuring at t ¼ 0, and having zero duration,
infinite magnitude, and a strength of unity. When considered as an input to the
aircraft, test pilots refer to an impulse as a stick rap. The aircraft is trimmed and
the stick is rapidly moved forward or aft from the trimmed position and then
returned to the trimmed position. This input can be thought of as basically hitting
or rapping the stick and allowing it to return to the trim position. A unit impulse
is illustrated in Fig. 7.11.
322 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 338 of 650 --

A unit step is defined by the following:
0 for t < 0; 	1 for t > 0
A unit step is illustrated in Fig. 7.12. A test pilot will input a step input by
rapidly moving the stick forward or aft from the trimmed postion and holding
it. Of course, test pilot inputs only approximate the ideal unit impulse and unit
step inputs. These approximations are generally sufficient to excite the dy-
namics and response of the aircraft, so we have a convenient way to compare
the ideal world of the unit impulse and unit step to the practical world of the
aircraft in flight.
The Laplace transform of a unit impulse is
L½dðtÞ ¼ 1
and for a unit step
L½1ðtÞ ¼ 1=s
7.3.1.2 	Laplace tables. 	To simplify transforming expressions from the
time domain to the Laplace domain and the taking of the inverse transform to go
from the Laplace domain back to the time domain, we will rely on a table of
Laplace transforms. Such a table is presented in Appendix E, which contains
most of the expressions we will need. More detailed tables are available in a
variety of references.
7.3.1.3 	Solving 	differential 	equations 	using 	Laplace 	transforms.
Laplace transforms are used to solve differential equations through a three-step
Fig. 7.11 	Unit impulse.
Fig. 7.12 	Unit step.
AIRCRAFT DYNAMIC STABILITY 	323

-- 339 of 650 --

process. First, the Laplace transform of the differential equation is obtained;
second, the resulting equation is solved algebraically for the unknown variable=
variables; and third, the inverse Laplace transform of each variable is obtained
resulting in the desired time solution of the original differential equation. A
simple example will illustrate this method.
Example 7.7
Find the time response for the following differential equation:
€xx ¼ 6; 	xð0Þ ¼ _xxð0Þ ¼ 0
Taking the Laplace transform,
s2X ðsÞ ¼ 6=s
Solving for X ðsÞ,
X ðsÞ ¼ 6=s3
and taking the inverse Laplace using #8 in Appendix E,
xðtÞ ¼ 3t2
which is the time solution.
7.3.1.4 	Transfer functions and the characteristic equation. 	A transfer
function is defined as the ratio of Laplace transforms of output to input. Outputs
for our applications will typically be motion variables such as u, angle of attack,
and yaw rate, which describe velocities, angles, or angular rates of the aircraft.
Inputs for our applications will be aircraft control surface deflections such as
elevator deflection (de) or aileron deflection (da). In simple terms
Transfer function ¼ L Output
Input
 	
A transfer function will be expressed in Laplace notation and will be obtained
from the Laplace form of the aircraft equations of motion. Example 7.8 illus-
trates how a transfer function is obtained from a differential equation and the
utility it has for a variety of inputs.
Example 7.8
Find the transfer function fðsÞ=daðsÞ for the following simplified differential
equation defining roll angle response. Assume zero initial conditions.
€ff þ 0:704 _ff ¼ 0:037da
324 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 340 of 650 --

Taking the Laplace transform
s2fðsÞ þ 0:704sfðsÞ ¼ 0:037daðsÞ
Solving for fðsÞ
fðsÞ ¼ 0:037daðsÞ
sðs þ 0:0704Þ
and obtaining the transfer function
fðsÞ
daðsÞ ¼ 0:037
sðs þ 0:0704Þ
For an impulse input, daðsÞ ¼ 1
fðsÞ ¼ 0:037
sðs þ 0:0704Þ
and, taking the inverse Laplace transform using the Laplace tables we have the
time response
fðtÞ ¼ 0:037
0:0704 ð1  e0:0704t Þ
For a unit step input, daðsÞ ¼ 1=s
fðsÞ ¼ 0:037
s2ðs þ 0:0704Þ
and the time response is
fðtÞ ¼ 0:037
ð0:0704Þ ð0:0704t  1 þ e0:0704t Þ
The characteristic equation of a transfer function is obtained by setting the
polynomial in the denominator of the transfer function equal to zero. For
Example 7.8, the characteristic equation is
sðs þ 0:0704Þ ¼ 0 	ð7:25Þ
The roots of a characteristic equation will define the overall system dynamic
characteristics such as time constant (for first-order systems), and damping
ratio and natural frequency (for second-order systems) as discussed in Sec.
7.1.2. For Eq. (7.25), the root s ¼ 0 leads to a steady state value term in the
time solution, and the root s ¼ 0:0704 leads to a time constant of 1=0.0704 s
and a e0:0704t term in the time solution.
AIRCRAFT DYNAMIC STABILITY 	325

-- 341 of 650 --

7.3.1.5 	Partial fraction expansion. 	A key step in using Laplace trans-
forms to solve differential equations involves using the Laplace transform tables
to find inverse transforms. It is impossible to cover every potential case in a table,
but the method of partial fractions can aid in breaking up involved transfer
functions into pieces, which may be included in a standard table. This text will
only review the case of a transfer function with nonrepeated real roots in the
characteristic equation. A more detailed coverage of partial fraction expansion
techniques is included in most engineering mathematics textbooks such as
Advanced Engineering Mathematics, by Erwin Kreyszig.
Consider the transfer function:
X ðsÞ
Y ðsÞ ¼ s þ 2
s3 þ 8s2 þ 19s þ 12 ¼ s þ 2
ðs þ 3Þðs þ 4Þðs þ 1Þ
It can be rewritten using a partial fraction expansion as
X ðsÞ
Y ðsÞ ¼ A1
s þ 3 þ A2
s þ 4 þ A3
s þ 1
To evaluate the constants A1 , A2 , and A3, which are also called residues, we
use the following approach:
A1 ¼ s þ 2
ðs þ 4Þðs þ 1Þ s¼3
¼ 1
2
A2 ¼ s þ 2
ðs þ 3Þðs þ 1Þ s¼4
¼  2
3
A3 ¼ s þ 2
ðs þ 3Þðs þ 4Þ s¼1
¼ 1
6
The partial fraction representation of the transfer function then becomes
X ðsÞ
Y ðsÞ ¼
1
2
s þ 3 þ  2
3
s þ 4 þ
1
6
s þ 1
Each of the partial fraction expressions can be transformed to the time domain
using the common first-order transform found in all Laplace tables.
L1 	K
s þ a
 	
¼ Keat
For this example, we then have
xðtÞ
yðtÞ ¼ 1
2 e3t  2
3 e4t þ 1
6 et
326 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 342 of 650 --

The residues (A1 , A2 , and A3 ) also provide a weighting of the relative magni-
tude of each component of the response.
Slightly modified partial fraction approaches are defined in mathematics
texts for characteristic equation roots, which are repeated real numbers,
complex conjugates, and a repeated pair of complex conjugates.
7.3.1.6 	Initial and final value theorems. 	The initial value of a function
(at t ¼ 0) can be found if its Laplace transform is known using the following
theorem:
f ðtÞjt!0 ¼ lim js!1sFðsÞ
For example, consider the function
f ðtÞ ¼ e3t
Lðe3t Þ ¼ 1
s þ 3
Applying the initial value theorem,
lim jt!0e3t ¼ lim js!1s 1
s þ 3
 	
¼ 1 ¼ e3ð0Þ
This theorem is useful in verifying the accuracy of Laplace transforms because
the initial conditions are normally known.
The steady-state (t ! 1) value of a time domain function can be found if
its Laplace transform is known and if it has a finite steady-state value using
the following theorem:
lim jt!1 f ðtÞ ¼ lim js!0sFðsÞ
This theorem does not apply to unstable functions or undamped sinusoidal
functions. As an example of application of this theorem, consider the Laplace
transform:
X ðsÞ ¼ 1
sðs þ 1Þ
To find the steady-state value of x at t ¼ 1, we can apply the final value theo-
rem:
lim jt!1xðtÞ ¼ lim js!0s 1
sðs þ 1Þ
 	
¼ 1 ¼ xð1Þ
AIRCRAFT DYNAMIC STABILITY 	327

-- 343 of 650 --

This result can be checked using
L1 	1
sðs þ 1Þ
 	
¼ 1  et ¼ xðtÞ
and
xð1Þ ¼ 1  e1 ¼ 1
The final value value theorem provides an easy method to find the steady-state
value of a Laplace expression.
7.3.2 	Longitudinal Linearized EOM in Laplace Form
We will now use the power of Laplace transforms to recast the aircraft
EOM developed in Sec. 6.5. The equations become somewhat long but the
concepts are not complex. Equation (6.127), the longitudinal linearized differ-
ential EOM for the aircraft, are repeated for reference.
_uu ¼ gy cos Y1 þ X u u þ XT u u þ Xa a þ Xde de
_ww  U1q ¼ gy sin Y1 þ Zu u þ Za a þ Z_aa _aa þ Z q q þ Zde de 	ð7:26Þ
_qq ¼ Mu u þ M T u u þ Ma a þ M Ta a þ M_aa _aa þ M q q þ Mde de
We will take the Laplace transform of these equations, but first it is important
to note that these three EOM have five aircraft motion variables (u, y, a, w,
and q) and de. Because we only have three defining equations, we need to
reduce this down to three motion variables and de becomes the input or forcing
function for the system We will use the kinematic relations and the approxima-
tion for angle of attack, a, to reduce to the three motion variables of a, u,
and y.
From the kinematic equations [Eq. (4.80)] and the assumption of initial
trimmed flight with the wings level condition
q ¼ _yy; 	_qq ¼ €yy
Also, for small perturbations
a  w
U1
) w ¼ aU1 	and 	_ww ¼ _aaU1
Therefore, our aircraft motion variables are reduced to a, u, and y. These
should be thought of as the outputs for our system of differential equations.
328 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 344 of 650 --

With zero initial conditions, the Laplace transform of Eq. (7.26) yields
suðsÞ ¼ gyðsÞ cos Y1 þ X u uðsÞ þ X T u uðsÞ þ Xa aðsÞ þ Xde deðsÞ
sU1aðsÞ  U1syðsÞ ¼ gyðsÞ sin Y1 þ Zu uðsÞ þ Za aðsÞ þ Z_aasaðsÞ þ Zq syðsÞ
þ Zde deðsÞ
s2yðsÞ ¼ M u uðsÞ þ M T u uðsÞ þ Ma aðsÞ þ M Ta aðsÞ þ M_aasaðsÞ þ M q syðsÞ þ Mde deðsÞ
Combining terms yields
ðs  Xu  X T u ÞuðsÞ  Xa aðsÞ þ g cos Y1yðsÞ ¼ Xde deðsÞ
 Zu uðsÞ þ ½ðU1  Z_aaÞs  ZaaðsÞ þ ½ðZ q  U1Þs þ g sin Y1yðsÞ ¼ Zde deðsÞ
 ðM u þ M T u ÞuðsÞ  ½M_aas þ Ma þ M Ta aðsÞ þ ðs2  M q sÞyðsÞ ¼ Mde deðsÞ
Notice at this point that we have moved the terms with de (elevator deflection)
to the right-hand side of the equal sign because de is the forcing function (or
input) for each of the three differential equations. In matrix form this yields
ðs  Xu  X T u Þ 	Xa 	g cos Y1
Zu 	½sðU1  Z_aaÞ  Za 	½ðZ q þ U1Þs þ g sin Y1
ðM u þ M T u Þ 	½M_aas þ Ma þ M Ta  	ðs2  M q sÞ
2
6
4
3
7
5
uðsÞ
aðsÞ
yðsÞ
2
6
4
3
7
5
¼
Xde
Zde
Mde
2
6
4
3
7
5deðsÞ
In terms of the transfer functions uðsÞ
deðsÞ, aðsÞ
deðsÞ, and yðsÞ
deðsÞ, we have
ðs  X u  XT u Þ 	Xa 	g cos Y1
Zu 	½sðU1  Z_aaÞ  Za 	½ðZ q þ U1Þs þ g sin Y1
ðM u þ M T u Þ 	½M_aas þ Ma þ M Ta  	ðs2  M q sÞ
2
6
4
3
7
5
uðsÞ
deðsÞ
aðsÞ
deðsÞ
yðsÞ
deðsÞ
2
6
6
6
6
6
6
6
4
3
7
7
7
7
7
7
7
5
¼
Xde
Zde
Mde
2
6
4
3
7
5 	ð7:27Þ
and each of the three longitudinal transfer functions can be determined using
Cramer’s rule as presented in Appendices F and G. It is important at this point
AIRCRAFT DYNAMIC STABILITY 	329

-- 345 of 650 --

not to lose sight of what we have developed. Each of these transfer functions
can be represented as the ratio of two polynomials in the Laplace variables.
uðsÞ
deðsÞ ¼ A u s3 þ B u s2 þ Cu s þ Du
Es4 þ Fs3 þ Gs2 þ Hs þ I ð7:28Þ
aðsÞ
deðsÞ ¼ Aas3 þ Bas2 þ Cas þ Da
Es4 þ Fs3 þ Gs2 þ Hs þ I ð7:29Þ
yðsÞ
deðsÞ ¼ Ays2 þ Bys þ Cy
Es4 þ Fs3 þ Gs2 þ Hs þ I ð7:30Þ
Notice that all three longitudinal transfer functions have the same input (de)
and the same denominator. There is a separate transfer function for each of our
three longitudinal motion variables (u, a, and y). Also, each of these transfer
functions has the same characteristic equation:
Es4 þ Fs3 þ Gs2 þ Hs þ I ¼ 0
Recall that the characteristic equation determines the dynamic stability char-
acteristics of the response, and therefore all three transfer functions will have
the same dynamic characteristics (parameters such as z, on, and t). Notice also
that the numerator of each transfer function is different. Each numerator coeffi-
cient is designated by an A, B, C, or D with a subscript appropriate to its
respective transfer function. The numerator affects the magnitude of the
response, and therefore each motion variable will have a different magnitude of
response but with the same dynamic characteristics.
7.3.2.1 	Three-degree-of-freedom analysis of longitudinal modes of
motion. 	The preceding development included the three motion variables u, a,
and y. This analysis may also be termed a three-degree-of-freedom (3 DOF)
determination of the longitudinal transfer functions. Normally, with the help of
root solvers such as those available in MATLAB1
(a registered trademark of The
MathWorks, Inc.), the fourth order characteristic equation for longitudinal motion
can be written as the product of two second-order (oscillatory) polynomials.
ðs2 þ 2zSPoN SP s þ o2
N SP Þðs2 þ 2zPH oN PH s þ o2
N PH Þ ¼ 0 	ð7:31Þ
The subscript SP refers to the short period mode and the subscript PH refers
to the phugoid mode. All airplanes have these two longitudinal dynamic
modes. Each of these polynomials can be thought of as a separate characteris-
tic equation that defines the dynamic characteristics of its respective dynamic
mode.
The coefficients (and roots) of each characteristic equation change with
flight condition, airplane mass, mass distribution, airplane geometry, and aero-
dynamic characteristics. These changes translate to changes in on and z, but
the fundamental presence of the short period and phugoid modes is main-
tained.
330 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 346 of 650 --

The short period mode is characterized by complex conjugate roots with
a moderate to relatively high damping ratio and relatively high natural
frequency and damped frequency (short period). It is easily demonstrated by
first trimming the aircraft and then disturbing it from trim with a forward-aft-
neutral pitch stick input (commonly called a doublet). The resulting response
back to trim may be either first order (exponential decay) or second order
(oscillatory). Significant variations in the angle of attack (a), and pitch attitude
(y) longitu-dinal motion variables occur while the airspeed (u) motion variable
remains fairly constant. Trim is generally regained in a few seconds, thus the
descriptive name short period and the small variation in airspeed. Typical time
histories for the short period response of a fighter aircraft to a doublet input
are presented in Fig. 7.13.
Notice that the response is second order (oscillatory) and that u remains
fairly constant. Oscillations of larger magnitude are observed with a and y.
Notice also that the response is stable.
The phugoid mode is characterized by complex conjugate roots with a
relatively low damping ratio and natural=damped frequency (long period). It is
demonstrated by trimming the aircraft in level flight, then inputting aft stick
for approximately 2–3 s, bleeding off some airspeed, and then returning the
stick to the neutral (trimmed) position. The resulting response is usually oscil-
latory with significant variations in pitch attitude and airspeed, while angle of
attack remains relatively constant. The phugoid has been described as an up
and down roller coaster oscillation in the sky that trades off kinetic and poten-
tial energy. As the oscillation starts, airspeed decreases while the airplane gains
altitude (pitch angle is positive). The aircraft then begins to lose altitude, and
airspeed increases while the pitch angle decreases. This is followed by the
aircraft pulling up gradually and returning to the climb portion of the phugoid
oscillation. The period for the phugoid is typically quite long (somewhere
Fig. 7.13 	u, a, and u time history plots illustrating the short period mode.
AIRCRAFT DYNAMIC STABILITY 	331

-- 347 of 650 --

between 30 and 120 s). Typical time histories for the phugoid mode are
presented in Fig. 7.14.
Notice that the response is also second order for the phugoid and that angle
of attack remains relatively constant. The frequency of the oscillation for the
phugoid is much lower than that observed for the short period mode. The
phugoid as shown in Fig. 7.14 is stable, but this may not be the case for all
flight conditions.
Example 7.9
The a=de transfer function for a T-37 cruising at 30,000 ft and 0.46 Mach
follows. Find the natural frequency, damping ratio, damped frequency, and
time constant for the short period and phugoid modes.
a
de
¼ 0:0924 ðs þ 336:1Þðs2 þ 0:0105s þ 0:0097Þ
ðs2 þ 4:58s þ 21:6Þðs2 þ 0:0098s þ 0:0087Þ
We go immediately to the two characteristic equations
s2 þ 4:58s þ 21:6 ¼ 0
s2 þ 0:0098s þ 0:0087 ¼ 0
The natural frequency (on) for the first characteristic equation is
on ¼ ffiffiffiffiffiffiffiffiffi
21:6
p ¼ 4:65 rad=s
Fig. 7.14 	u, a, and u time history plots for the phugoid mode.
332 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 348 of 650 --

and for the second equation
on ¼ ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
0:0087
p ¼ 0:0933 rad=s
We can identify the first characteristic equation as being for the short period
mode because of the higher natural frequency. The phugoid dynamics are
contained in the second characteristic equation. Thus
on sp ¼ 4:65 rad=s
on ph ¼ 0:0933 rad=s
and
zsp ¼ 4:58
2on sp
¼ 0:493
zph ¼ 0:0098
2on ph
¼ 0:0525
Notice that both the short period and phugoid responses will be second order
because z is less than 1. Both responses are stable because zon is positive for
each mode. The damped frequency is
oD ¼ on
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
q
oDsp ¼ onsp
ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
sp
q
¼ 4:65
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  ð0:493Þ2
q
¼ 4:046 rad=s
oDph ¼ onph
ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
ph
q
¼ 0:0933
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  ð0:0525Þ2
q
¼ 0:0932 rad=s
and for the time constant
tsp ¼ 1
zspon sp
¼ 1
ð0:493Þð4:65Þ ¼ 0:436 s
tph ¼ 1
zphon ph
¼ 1
ð0:0525Þð0:0933Þ ¼ 204:2 s
7.3.2.2 	Two-degree-of-freedom short period approximation. 	To gain
insight into the stability parameters and derivatives that influence the dynamic
characteristics of the short period mode, we will look at a two-degree-of-freedom
(2 DOF) approximation. This is a solution in which the motion is constrained to
AIRCRAFT DYNAMIC STABILITY 	333

-- 349 of 650 --

two motion variables rather than three. Recalling our discussion on the short
period mode, we will make the simplifying assumption that u remains near zero
and can be removed from Eq. (7.27). With this assumption and the elimination of
the x-force equation (which is assumed to have a negligible effect if u is
approximately constant), we retain the z-force equation and the pitching moment
equation along with the motion variables a and y.
ðs  X u  XT u Þ 	Xa 	g cos Y1
Zu 	½sðU1  Z_aaÞ  Za 	½ðZ q þ U1Þs þ g sin Y1
ðM u þ M T u Þ 	½M_aas þ Ma þ M Ta  	ðs2  M q sÞ
2
6
4
3
7
5
uðsÞ
aðsÞ
yðsÞ
2
6
4
3
7
5
¼
Xde
Zde
Mde
2
6
4
3
7
5deðsÞ
Equation (7.27) becomes
½sðU1  Z_aaÞ  Za 	½ðZ q þ U1Þs þ g sin Y1
½M_aas þ Ma þ M Ta  	ðs2  M q sÞ
 	 aðsÞ
yðsÞ
 	
¼ Zde
Mde
 	
deðsÞ
ð7:32Þ
We will next focus on the dynamic characteristics and the characteristic equa-
tion (which is the determinant of the first coefficient matrix). We will look at
the 	short 	period 	approximation 	assuming 	that 	Z_aa ¼ Zq ¼ Y1 ¼ M Ta ¼ 0
because these terms are generally small compared to the others.
Equation (7.32) becomes
sU1  Za 	U1s
½M_aas þ Ma 	s2  M q s
 	 aðsÞ
yðsÞ
 	
¼ Zde
Mde
 	
deðsÞ
The characteristic equation is
ðsU1  ZaÞðs2  M q sÞ  ðU1sÞð½M_aas þ MaÞ ¼ 0
or
sU1 s2  	M q þ Za
U1
þ M _aa
 	
s þ ZaM q
U1
 Ma
 		 	
¼ 0
and in simplified form
s2  	M q þ Za
U1
þ M _aa
 	
s þ ZaM q
U1
 Ma
 	
¼ 0 	ð7:33Þ
334 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 350 of 650 --

For this 2-DOF approximation we can find aðsÞ=deðsÞ and yðsÞ=deðsÞ using
Cramer’s rule as before.
aðsÞ
deðsÞ ¼ Zde s þ ðMde U1  M q Zde Þ
U1 s2  	M q þ Za
U1
þ M_aa
 	
s þ ZaM q
U1
 Ma
 		 	
yðsÞ
deðsÞ ¼ ðU1Mde þ Zde M_aaÞs þ ðMaZde  ZaMde Þ
sU1 s2  ðM q þ Za
U1
þ M_aa
 	
s þ ZaM q
U1
 Ma
 	
ð7:34Þ
An approximation of natural frequency and damping ratio can then be deter-
mined using Eq. (7.33).
on SP 
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ZaM q
U1
 Ma
s
ð7:35Þ
zSP 
 M q þ Za
U1
þ M_aa
 	
2on SP
ð7:36Þ
Typically, Ma is much larger that ZaM q=U1 (as long as the c.g. is not too far
aft). This results in
onsp  ffiffiffiffiffiffiffiffiffiffi
Ma
p ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
C ma qq1S cc
Iyy
s
ð7:37Þ
The following insights can be observed from Eq. (7.37) for the short period
mode natural frequency: 1) onSP will increase as static longitudinal stability
(Cma ) increases or as the distance between the c.g. and the aircraft AC
increases; 2) on SP will increase as dynamic pressure (qq1 ) increases; and 3) on SP
will decrease as the pitching moment of inertia (I yy) increases.
Equation (7.36) also leads to important insights for the short period damp-
ing ratio: 1) M q, the pitch damping derivative, is the driving term, because 2)
Za=U1 is generally driven by other requirements, and 3) M_aa is generally driven
by the same design features (horizontal tail size and the distance from the c.g.
to the AC of the tail) as M q, and M_aa is typically about one-third the value of
M q. One of the limitations of this approximation for damping ratio is that it
assumes that z is positive (a stable case), which is not always true. It is recom-
mended that unstable cases be analyzed using a 3-DOF solution.
7.3.2.3 	Two-degree-of-freedom phugoid approximation. 	As with the
short period approximation, we will look at a 2-DOF approximation for the
phugoid mode to gain insight into the parameters that influence dynamic
characteristics. For the phugoid approximation, we will assume that a is constant
AIRCRAFT DYNAMIC STABILITY 	335

-- 351 of 650 --

with u and y (or q) as the motion variables. We can eliminate the aðsÞ terms and
the moment equation in Eq. (7.27) to yield two equations with two motion
variables.
s  Xu  X T u 	Xa 	g cos Y1
Zu 	½sðU1  Z_aaÞ  Za 	½ðZ q þ U1Þs þ g sin Y1
ðM u þ M T u Þ 	½M_aas þ Ma þ M Ta  	ðs2  M q sÞ
2
6
4
3
7
5
uðsÞ
aðsÞ
yðsÞ
2
6
4
3
7
5
¼
Xde
Zde
Mde
2
6
4
3
7
5deðsÞ
or
s  X u  XT u 	g cos Y1
Zu 	½ðZq þ U1Þs þ g sin Y1
 	 uðsÞ
yðsÞ
 	
¼ Xde
Zde
 	
deðsÞ
If we assume Xde ¼ Z q ¼ Y1  0 we get
s  Xu  XT u 	g
Z u 	U1s
 	 uðsÞ
yðsÞ
 	
¼ 0
Zde
 	
deðsÞ 	ð7:38Þ
The characteristic equation becomes
ðs  Xu  XT u ÞðU1sÞ þ gZ u ¼ 0
 U1 s2  ðXu þ X T u Þs  Zu
U1
g
 	
¼ 0 	ð7:39Þ
We then have
on ph 
ffiffiffiffiffiffiffiffiffiffiffi
Zu g
U1
s
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
g
U1
ðqq1SÞðC L u þ 2CL1 Þ
mU1
 		s
or
onph 
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
gðqq1SÞðCL u þ 2CL1 Þ
U 2
1 m
s
336 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 352 of 650 --

Typically C L u  2C L1 and C L1 ¼ mg=qq1S. With these assumptions we have
on ph 
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
gðqq1SÞ
U 2
1 m
2mg
qq1S
 		s
¼
ffiffiffiffiffiffiffi
2g2
U 2
1
s
or
on ph  g
U1
ffiffiffi
2
p ð7:40Þ
Therefore, we can observe that the natural frequency of the phugoid mode is
approximately inversely proportional to the forward velocity, U1 .
Returning to the characteristic equation [Eq. (7.39)], we can define an
approximation for the phugoid damping ratio:
zph  ðXu  XT u Þ
2onph
Because
X u ¼  ðC Du þ 2CD1 Þqq1S
mU1
and 	XT u ¼ ðCT xu
þ 2CT x1
Þqq1S
mU1
We can substitute these values into the expression for zph
zph  ðCD u þ 2CD1  C T xu
 2CT x1
Þqq1S
2mU1on ph
ð7:41Þ
Equation (7.41) provides us with an approximation for the phugoid damping
ratio. To gain a little more insight, we will look at the case of unpowered or
gliding flight where
CT x1
¼ CT xu
¼ 0
With this assumption
zph ¼ ðC Du þ 2CD1 Þqq1S
2mU1onp
¼ ðC Du þ 2CD1 Þqq1SU1
2mU1g ffiffiffi
2
p
zph ¼ ðC Du þ 2CD1 Þqq1S
2 ffiffiffi
2
p mg ¼ ðC Du þ 2CD1 Þ
2 ffiffiffi
2
p 1
CL1
AIRCRAFT DYNAMIC STABILITY 	337

-- 353 of 650 --

At this point we can make one additional assumption for low-speed flight
where
C Du  0:
With this additional assumption, we have
zph  2C D1
2 ffiffiffi
2
p CL1
¼ 1ffiffiffi
2
p CD1
C L1
ð7:42Þ
Equation (7.42) indicates that the phugoid damping ratio is inversely propor-
tional to the lift to drag ratio (L=D). Of course we must keep in mind all the
assumptions we made to obtain this result. It does indicate that airplanes with
high values of L=D may have poor phugoid damping. If this is the case,
precise control of speed becomes difficult, which can be a problem during the
initial phases of a landing pattern. However, after the gear and flaps have been
lowered, L=D is reduced and damping of the phugoid improves.
Example 7.10
To illustrate the concepts of transfer functions, characteristic equations, and
the modes of motion, we will consider a Lear Jet flying at 0.7 Mach and
40,000 ft. The 3-DOF longitudinal transfer functions are approximated by
uðsÞ
deðsÞ ¼ ð6:312Þs2  ð4927Þs  4302
ð675:9Þs4 þ ð1371Þs3 þ ð5459Þs2 þ ð86:31Þs þ 44:78
aðsÞ
deðsÞ ¼ ð0:746Þs3 þ ð208:3Þs2 þ ð2:665Þs þ 1:39
ð675:9Þs4 þ ð1371Þs3 þ ð5459Þs2 þ ð86:31Þs þ 44:78
yðsÞ
deðsÞ ¼ ð208:1Þs2 þ ð136:9Þs þ 2:380
ð675:9Þs4 þ ð1371Þs3 þ ð5459Þs2 þ ð86:31Þs þ 44:78
Find the natural frequency, damping ratio, damped frequency, time constant,
and period of oscillation for the short period and phugoid modes.
The characteristic equation is found by setting the denominator of the trans-
fer function equal to 0. The characteristic equation for the Lear Jet’s longitudi-
nal motion is
675:9s4 þ 1371s3 þ 5459s2 þ 86:31s þ 44:78 ¼ 0
or
s4 þ 2:0284s3 þ 8:0766s2 þ 0:1277s þ 0:06625 ¼ 0
338 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 354 of 650 --

Using a root solver, such as those available in MATLAB, the four roots are
found to be
s1;2 ¼ zSPoN SP  ioD SP ¼ 1:008  ið2:651Þ
s3;4 ¼ zPH oN PH  ioDPH ¼ 0:0069  ið0:0905Þ
The roots with the largest oD are obviously associated with the short period
mode of motion, while the other roots are associated with the phugoid mode
of motion.
zSPoN SP ¼ 1:008oDSP ¼ 2:651 rad=s 	ðshort periodÞ
zPH oN PH ¼ 0:0069oD PH ¼ 0:0905 rad=s 	ðphugoidÞ
oN SP ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ðzoN Þ2
SP þ o2
DSP
q
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ð1:008Þ2 þ ð2:651Þ2
q
¼ 2:836 rad=s
oN PH ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ðzoN Þ2
PH þ o2
D PH
q
¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ð0:0069Þ2 þ ð0:0905Þ2
q
¼ 0:091 rad=s
zSP ¼ zSPoN SP
oN SP
¼ 1:008
2:836 ¼ 0:355
zPH ¼ zPH oN PH
oN PH
¼ 0:0069
0:091 ¼ 0:076
tSP ¼ 1
zSPoN SP
¼ 1
1:008 ¼ 0:992 s
tPH ¼ 1
zPH oN PH
¼ 1
0:0069 ¼ 144:93 s
The fourth-order characteristic equation can therefore be written as two
second-order (oscillatory) characteristic equations in the form
ðs2 þ 2zSPoN SP s þ o2
N SP Þðs2 þ 2zPH oN PH s þ o2
N PH Þ ¼ 0
For the Lear Jet example, this is
ðs2 þ 2:016s þ 8:0429Þðs2 þ 0:0138s þ 0:00828Þ ¼ 0
Note that the relative magnitudes of the short period and phugoid characteris-
tics are as expected
oN SP ¼ 2:836 rad=s > oN PH ¼ 0:091 rad=s
zSP ¼ 0:355 > zPH ¼ 0:076
oD SP ¼ 2:651 rad=s > oD PH ¼ 0:905 rad=s
tSP ¼ 0:992 s < tPH ¼ 144:93 s
AIRCRAFT DYNAMIC STABILITY 	339

-- 355 of 650 --

The period of oscillation can be found using
T ¼ 2p
oD
Tsp ¼ 2p
2:651 s ¼ 2:37 s
Tph ¼ 2p
0:0905 s ¼ 69:43 s
It is also worthwhile to plot the short period and phugoid roots from
Example 7.10 on the complex plane. This is accomplished in Fig. 7.15. Notice
that the short period roots are further out from the origin and have a higher
damping ratio than the phugoid roots. The relative location of these roots is
typical for most aircraft.
Example 7.11
Use the short period and phugoid 2-DOF approximations to estimate the
natural frequency, damping ratio, damped frequency, and period of oscilla-
tion for the Lear Jet. Compare the approximation results to those obtained in
Example 7.10.
Using the short period approximation Eq. (7.34), we have
s2 þ 2:0173s þ 8:0777 ¼ 0
Fig. 7.15 	Complex plane plot of longitudinal roots for Example 7.10.
340 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 356 of 650 --

and
on sp ¼ ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
8:0777
p rad=s ¼ 2:842 rad=s 	ð2:836 rad=s for the 3-DOF caseÞ
Because
2zspon sp ¼ 2:0173 ) zsp ¼ 0:355 	ð0:355 for the 3-DOF caseÞ
and
oDsp ¼ on sp
ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
sp
q
¼ 2:657 rad=s 	ð2:651 rad=s for the 3-DOF caseÞ
T sp ¼ 2p
oD sp
¼ 2:365 s 	ð2:37 s for the 3-DOF caseÞ
As can be seen, the comparisons with the 3-DOF case are very good.
For the phugoid approximation, we use Eq. (7.39) to obtain the characteris-
tic equation:
s2 þ 0:0075s þ 0:00663 ¼ 0
For natural frequency we have
on PH ¼ ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
0:00663
p rad=s ¼ 0:0814 rad=s 	ð0:091 rad=s for the 3-DOF caseÞ
To obtain damping ratio,
2zPH onPH ¼ 0:0075 ) zPH ¼ 0:0461 	ð0:076 for the 3-DOF caseÞ
and
oDPH ¼ on PH
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
PH
q
¼ 0:0813 rad=s 	ð0:0905 rad=s for the 3-DOF caseÞ
TPH ¼ 2p
oD PH
¼ 77:27 s 	ð69:43 s for the 3-DOF caseÞ
In this example, the 2-DOF phugoid approximation provides estimates to
approximately 10% accuracy with the exception of damping ratio, which has a
40% error.
AIRCRAFT DYNAMIC STABILITY 	341

-- 357 of 650 --

7.3.3 	Lateral-Directional Linearized EOM in Laplace Form
We next use the same approach developed in Sec. 7.3.2 to transform the
linearized lateral-directional EOM developed in Sec. 6.5 to the Laplace
domain. Again, the linearized EOM Eq. (6.133) are repeated for reference
_vv þ U1r ¼ gf cos Y1 þ Yb b þ Yp p þ Y r r þ Yda da þ Ydr dr
_pp  AA1 _rr ¼ Lb b þ Lp p þ Lr r þ Lda da þ Ldr dr 	ð7:43Þ
_rr  BB1 _pp ¼ Nb b þ N Tb b þ Nr r þ Nda da þ Ndr dr
where
AA1 ¼ I xz
I xx
and 	BB1 ¼ I xz
I zz
Notice that the three EOM have five aircraft motion variables (v, p, r, f, and
b) along with da and dr. da and dr are the inputs or forcing functions for the
lateral-directional system. Because we have only three equations, we will
reduce the number of motion variables to three by using the kinematic equa-
tions [Eq. (4.80)] and the assumption of a small pitch attitude angle (Y1 ). Also
recall that we previously made the assumption of f ¼ 0 (wings level in
trimmed flight) in Sec. 7.3.2. With these assumptions, we have
p ¼ _ff 	and 	r ¼ _cc
Also, for small perturbations
b  v
U1
) v  bU1 	and 	_vv  _bbU1
Therefore, we can reduce our aircraft motion variables to b, f, and c. These
should be thought of as the outputs for our system of lateral-directional differ-
ential equations. We could have easily chosen v, p, and r for the output vari-
ables but instead chose the three angles. With zero initial conditions, the
Laplace transform of Eq. (7.43) becomes
sbðsÞU1 þ scðsÞ ¼ gfðsÞ cos Y1 þ Yb bðsÞ þ Yp sfðsÞ þ Y r scðsÞ þ Yda daðsÞ
þ Ydr drðsÞ
s2fðsÞ  AA1s2cðsÞ ¼ Lb bðsÞ þ L p sfðsÞ þ Lr scðsÞ þ Lda daðsÞ þ Ldr drðsÞ
s2cðsÞ  BB1s2fðsÞ ¼ Nb bðsÞ þ NTb bðsÞ þ N p sfðsÞ þ N r scðsÞ þ Nda daðsÞ
þ Ndr drðsÞ
342 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 358 of 650 --

Combining terms and moving the control inputs to the right-hand side of the
equal sign, we have
ðsU1  YbÞbðsÞ  ðsY p þ g cos Y1ÞfðsÞ þ sðU1  YrÞcðsÞ ¼ Yda daðsÞ þ Ydr drðsÞ
 Lb bðsÞ þ ðs2  Lp sÞfðsÞ  ðs2 AA1 þ Lr sÞcðsÞ ¼ Lda daðsÞ þ Ldr drðsÞ
 ðNb þ NTb ÞbðsÞ  ðs2 BB1 þ Np sÞfðsÞ þ ðs2  sN rÞcðsÞ ¼ NadaðsÞ þ N rdrðsÞ
Regrouping in matrix form
ðsU1  YbÞ 	ðsY p þ g cos Y1Þ 	sðU1  YrÞ
Lb 	ðs2  Lp sÞ 	ðs2 AA1 þ sL rÞ
Nb  NTb 	ðs2 BB1 þ Np sÞ 	ðs2  sN rÞ
2
6
6
4
3
7
7
5
bðsÞ
fðsÞ
cðsÞ
2
6
4
3
7
5
¼
Yda 	Ydr
Lda 	Ldr
Nda 	Ndr
2
6
4
3
7
5 daðsÞ
drðsÞ
 	
ð7:44Þ
and each of the six lateral-directional transfer functions can be determined
using Cramer’s rule as presented in Appendices F and G. The six lateral-direc-
tional transfer functions are
bðsÞ=daðsÞ; 	bðsÞ=drðsÞ; 	fðsÞ=daðsÞ; 	fðsÞ=drðsÞ;
cðsÞ=daðsÞ; 	and 	cðsÞ=drðsÞ:
Notice that there are six lateral-directional transfer functions vs the three we
have for longitudinal motion. This results from the fact that we have two possi-
ble control inputs (da and dr), each of which can cause changes in the three
lateral-directional motion variables. In an attempt to minimize the number of
equations needed to represent these transfer functions, we will temporarily drop
the subscript on da and dr because the transfer functions for each have the
same general form (Appendix G). Each of the lateral-directional transfer func-
tions can then be represented as the ratio of two polynominals in the Laplace
variables.
bðsÞ
dðsÞ ¼ Abs3 þ Bbs2 þ Cbs þ Db
E0s4 þ F0s3 þ G0s2 þ H0s þ I 0 	ð7:45Þ
fðsÞ
dðsÞ ¼ Afs2 þ Bfs þ Cf
E0s4 þ F0s3 þ G0s2 þ H0s þ I 0 	ð7:46Þ
cðsÞ
dðsÞ ¼ Acs3 þ Bcs2 þ Ccs þ Dc
sðE0s4 þ F0s3 þ G0s2 þ H0s þ I 0 Þ ð7:47Þ
Equations (7.45), (7.46), and (7.47) represent the general form of the six
lateral-directional transfer functions. For example, to obtain the bðsÞ=daðsÞ
AIRCRAFT DYNAMIC STABILITY 	343

-- 359 of 650 --

transfer function, simply use Eq. (7.45) and use the da derivatives (Yda , Lda ,
and Nda ) in the determination of Ab, Bb, Cb, and Db (see Appendix G). In a
similar fashion, to obtain the bðsÞ=drðsÞ transfer function, Eq. (7.45) is used,
and the dr derivatives (Ydr , Ldr , and Ndr ) are used in the determination of Ab,
Bb, Cb, and Db. As in the case of the longitudinal transfer functions, the
numerator of each lateral-directional transfer function is different. Because the
numerator affects the magnitude of the response, each of the three motion vari-
ables will have a different magnitude of response.
All six lateral-directional transfer functions have essentially the same
denominator, which leads to the same characteristic equation:
E0s4 þ F0s3 þ G0s2 þ H0s þ I 0 ¼ 0
The extra s in the denominator of the cðsÞ=dðsÞ transfer function indicates that
the airplane is neutrally stable in heading (that is, it will not return to a trim
heading when disturbed). The associated piece of the characteristic equation
(s ¼ 0) leads to a constant in the time response but is not that interesting from
the standpoint of dynamic stability. Notice that E0, F0, G0, H0, and I 0, are not
the same as the value of E, F, G, H, and I in Eqs. (7.28–7.30) (the longitudinal
transfer functions). Because the characteristic equation determines the dyna-
mic stability characteristics of the response, all six transfer functions will have
the same dynamic characteristics (z, on, and t) but a different magnitude of
response.
7.3.3.1 	Three-degree-of-freedom analysis of the lateral-directional
modes of motion. 	The preceding development of transfer functions for the
three lateral-directional motion variables b, f, and c leads to a 3-DOF solution
for lateral-directional motion. Normally, the fourth-order characteristic equation
for lateral-directional motion is written as the product of one second-order
(oscillatory) and two first-order (nonoscillatory) polynomials.
ðs2 þ 2zDRon DR s þ o2
n DR Þ s þ 1
tr
 	
s þ 1
ts
 	
¼ 0 	ð7:48Þ
The subscript DR refers to the dutch roll mode, the subscript r refers to the
roll mode, and the subscript s refers to the spiral mode. All airplanes have
these three lateral-directional dynamic modes. Each of these polynominals can
be thought of as a separate characteristic equation that defines the dynamic
characteristics of its respective mode.
As with the longitudinal case, the coefficients (and roots) of each character-
istic equation change with flight condition, airplane mass, mass distribution,
airplane geometry, and aerodynamic characteristics. These changes translate to
changes in on DR , zDR, tr, and ts, but the fundamental presence of the dutch
roll, roll, and spiral modes is maintained.
The dutch roll mode is a second-order response (complex conjugate
roots) usually characterized by concurrent oscillations in the three lateral-direc-
tional motion variables b, f, and c. In the discussion on static stability, it was
observed that sideslip generates both yawing and rolling moments that lead to
a coupled motion between b, f, and c. These oscillations may be of high or
344 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 360 of 650 --

low frequency and may be lightly or heavily damped. The dutch roll usually
begins with a sideslip perturbation followed by oscillations in roll and yaw.
The dutch roll motion is something like that of an ice skater’s body weaving
back and forth as weight shifts from one foot to the other. As the magnitude of
Clb (lateral static stability) becomes larger, more roll coupling is present during
dutch roll oscillations, and the dutch roll characteristics typically become more
objectionable. Objectionable dutch roll characteristics adversely affect precision
tasks like air-to-air and air-to-ground tracking, and formation flying.
The roll mode has a real root and a first-order (nonoscillatory) response
that involves almost a pure rolling motion about the x stability axis. It is
usually stable at low and moderate angles of attack but may be unstable at
high angles of attack. The roll mode can be excited by a disturbance or an
aileron input. It is easiest to characterize the roll mode when discussing
response to an aileron input. If a step aileron input (da) is made to the aircraft,
there is an exponential rise in roll rate ( _ff) until a steady state roll rate is
achieved. We saw this first-order type response in Sec. 7.1.1.1. From the pilot’s
standpoint, the time taken during the exponential rise to steady state is inter-
preted as a finite delay, which we usually characterize with the time constant
(tr). If tr is too large, the aircraft is considered sluggish because it may take
too long for the commanded roll rate to build up. Likewise, if tr is too small,
the aircraft may be too responsive to external disturbances such as turbulence.
The spiral mode is a first-order response (real root) that involves a rela-
tively slow roll and yawing motion of the aircraft. It may be stable or unstable.
The spiral is usually initiated by a displacement in roll angle and appears as a
descending turn with increasing roll angle if unstable. If the spiral is stable, the
aircraft simply returns to wings level after a roll angle displacement. The
primary motion variables during the spiral are f and c, while b remains close
to zero. A high degree of lateral stability (Clb ) will tend to make the spiral
stable, while a high degree of directional stability (Cnb ) will tend to make the
spiral unstable. Fortunately, spiral instability can be tolerated as long as the
time to double amplitude (based on the initial roll angle displacement) is
gradual (greater than approximately 4 s). Under these conditions, the pilot can
return the aircraft to wings level flight with little difficulty using an aileron
input. If the spiral mode is unstable, the time to double amplitude (T2 ) is calcu-
lated with
T 2 ¼ ln 2
unstable root ¼ 0:693
unstable root ð7:49Þ
Spiral stability is usually compromised for good dutch roll characteristics that
are typically achieved with relatively high directional stability and relatively
low lateral stability.
Example 7.12
The b=da transfer function for a T-37 cruising at 30,000 ft and 0.46 Mach is
given next. Find the natural frequency, damping ratio, and damped frequency
for the dutch roll mode, and the time constant for the dutch roll, roll, and
AIRCRAFT DYNAMIC STABILITY 	345

-- 361 of 650 --

spiral modes.
b
da
¼ 1:41 ðs þ 2:05Þðs þ 0:0741Þ
ðs þ 1:27Þðs þ 0:0037Þðs2 þ 0:227s þ 5:80Þ
We go immediately to the three characteristic equations
s2 þ 0:227s þ 5:8 ¼ 0
s þ 1:27 ¼ 0
s þ 0:0037 ¼ 0
The second-order equation is for the dutch roll mode, and we have
on DR ¼ ffiffiffiffiffiffiffi
5:8
p ¼ 2:41 rad=s
The damping ratio for dutch roll becomes
zDR ¼ 0:227
2onDR
¼ 0:0471
and the damped frequency is
oDDR ¼ on DR
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  x2
DR
q
¼ 2:41
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  ð0:0471Þ2
q
¼ 2:407 rad=s
The time constant for dutch roll is
tDR ¼ 1
zDRon DR
¼ 1
ð0:0471Þð2:41Þ ¼ 8:81 s
At this point, we should comment on the relatively low damping ratio and
large time constant for the dutch roll mode. As we will see, these do not pass
military specifications. As a result, the T-37 has a yaw damper installed to
improve the basic airframe dutch roll characteristics.
The two first-order characteristic equations are for the roll and spiral modes.
Referring back to Eq. (7.48) and realizing that the roll mode will have a smal-
ler time constant than the spiral mode, we have
tr ¼ 1
1:27 ¼ 0:787 s
ts ¼ 1
0:0037 ¼ 270 s
A few observations are in order. With the roll mode time constant being
less than 1 s, we can see that the T-37 roll response is fairly crisp. The spiral
mode is stable for this flight condition as indicated by the negative root
346 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 362 of 650 --

(s ¼ 0:0037). Because it is stable, the time constant indicates the time it
takes to return to 36.8% (1–0.632) of the initial displaced roll angle as the
aircraft returns to a wings-level attitude. For example, if the initial displaced
roll angle is 10 deg, it will take about 4.5 min (270 s) to return to a 3.68-deg
roll attitude (assuming the pilot makes no aileron input).
If the characteristic equation for the spiral had been
s  0:0037 ¼ 0
then the spiral would be unstable (a positive root at s ¼ 0:0037) and the time
to double amplitude would have been [using Eq. (7.49)]
T2 ¼ 0:693
0:0037 ¼ 187 s
A summary of root and response characteristics for the two longitudinal
and three lateral-directional dynamic modes of aircraft motion is presented in
Table 7.2.
7.3.3.2 	One-degree-of-freedom roll approximation. 	To gain an under-
standing of the stability parameters and derivatives that influence the roll mode,
we can eliminate two of the three degrees of freedom or motion variables. The roll
mode is the simplest of the five dynamic modes. We begin with Eq. (7.44) and
retain only the f motion variable, the da control input, and the rolling moment
equation. Thus, Eq. (7.44) simplifies to
ðs2  Lp sÞfðsÞ ¼ Lda daðsÞ
The roll approximation transfer function becomes
fðsÞ
daðsÞ ¼ Lda
sðs  LpÞ ð7:50Þ
Table 7.2 	Root and response characteristics for the aircraft
dynamic modes of motion
Mode 	Root type 	Response
Longitudinal
Short period 	Complex conjugate 	Oscillatory
Phugoid 	Complex conjugate 	Oscillatory
Lateral-directional
Dutch roll 	Complex conjugate 	Oscillatory
Roll 	Real 	Nonoscillatory
Spiral 	Real 	Nonoscillatory
AIRCRAFT DYNAMIC STABILITY 	347

-- 363 of 650 --

Equation (7.50) yields two roots for the characteristic equation: 0 and L p. The
root at s ¼ 0 is of little interest because it leads to the steady-state value;
however, the root s ¼ Lp is of more interest because it leads directly to an esti-
mate of the time constant for the roll mode
tr   1
L p
ð7:51Þ
Recall that L p is the roll damping stability parameter that is a direct function
of Clp the roll damping derivative. L p typically is negative, which makes the
roll mode stable. Thus, we can deduce from Eq. (7.51) that the higher the roll
damping, the smaller the roll mode time constant. This may seem counter-
intuitive at first, but remember that the time constant is only an indicator of the
time to a steady-state value. Our intuition tells us that more damping should
lead to a lower steady-state value, so we will investigate roll rate response to a
step aileron input using our approximation. We will define the magnitude of
the step aileron input as da. Thus
daðsÞ ¼ da
s
and from Eq. (7.50)
fðsÞ ¼ Lda da
s2ðs  LpÞ
The first step in finding the time response involves partial fractions.
fðsÞ ¼ A
s2 þ B
s þ C
ðs  L pÞ
where
A ¼ s2fðsÞjs¼0 ¼  Lda da
L p
B ¼ d
ds ½s2fðsÞs¼0 ¼  Lda da
ðs  LpÞ s¼0
¼  Lda
L2
p
da
C ¼ ðs  Lp sÞfðsÞjs¼L p ¼ Lda da
s2 s¼L p
¼ Lda
L2
p
da
Combining and taking the inverse Laplace,
fðtÞ ¼  Lda
Lp
da t  Lda
L2
p
da þ Lda
L2
p
da e L p t ¼  Lda
Lp
da t þ Lda
L2
p
da
!
ðe L p t  1Þ
348 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 364 of 650 --

Figure 7.16 plots a time response of the previous equation for roll angle to
illustrate a graphical method for obtaining the time constant.
To obtain roll rate, we take the time derivative:
_ffðtÞ ¼ p ¼  Lda
Lp
da þ Lp
Lda
L2
p
!
da e L p t
or
_ff ¼  Lda da
Lp
ð1  e L p t Þ 	ð7:52Þ
We can make several observations based on Eq. (7.52). The steady-state roll
rate achieved will be Lda da=L p, which indicates that the larger the aileron
control power stability parameter (Lda ) and=or the larger the magnitude of the
aileron input (da), the larger the steady-state roll rate will be. We can also see
that the magnitude of the steady-state roll rate is inversly proportional to the
roll damping stability parameter (Lp). In addition, the time constant predicted
by Eq. (7.51) is evident in the exponential term. To illustrate this, let
t ¼ 1=L p in Eq. (7.52).
_ff ¼  Lda da
Lp
ð1  e L p ð1=L p Þ Þ ¼  Lda da
Lp
ð1  e1Þ ¼ 0:632  Lda da
Lp
!
Thus, we can see that at t ¼ tr, the roll rate is equal to 63.2% of the steady-
state value. Figure 7.17 illustrates these points.
7.3.3.3 	Two-degree-of-freedom spiral approximation. 	Spiral motion
is dominated by bank angle, f, and heading angle, c, while b is very small. To
Fig. 7.16 	Roll angle response to a step aileron input.
AIRCRAFT DYNAMIC STABILITY 	349

-- 365 of 650 --

achieve a 2-DOF approximation, we will neglect the roll angle motion variable
and the sideforce equation. We neglect f because banking does not induce terms
that cause the aircraft to roll out (there are no terms like Clf ). b terms do have an
effect on roll out because of Clb to (lateral static stability). Thus, Eq. (7.44) can be
simplified to
Lb 	sðs AA1 þ LrÞ
Nb 	sðs  N rÞ
 	 bðsÞ
cðsÞ
 	
¼ Lda 	Ldr
Nda 	Ndr
 	 daðsÞ
drðsÞ
 	
The characteristic equation becomes:
Lbsðs  N rÞ  ðNbÞ s s I xz
I xx
þ Lr
 		 	
¼ 0
Close inspection reveals that a common factor in the characteristic equation is
s, which can be cancelled. Algebraic manipulation yields the root of the spiral
approximation characteristic equation as
s  LbN r  NbL r
Lb þ Nb
I xz
I xx
 	 	ð7:53Þ
For the spiral to be stable, this root must be negative. The denominator of Eq.
(7.53) is normally negative. Because Lb and N r are negative, and Nb and L r
are positive, we can deduce that the magnitude of Lb (lateral static stability)
should be larger than the magnitude of Nb (directional static stability) for a
stable spiral mode (assuming N r and L r are of approximately equal magnitude).
As discussed earlier, the unfavorable impact of this tradeoff on the dutch roll
may drive the designers to accept an unstable spiral (more directional stability)
Fig. 7.17 	Roll rate response to a step aileron input.
350 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 366 of 650 --

in favor of acceptable dutch roll characteristics, especially at low speeds. From
Eq. (7.53), the spiral time constant can be approximated by
ts 
Lb þ Nb
Ixz
I xx
 	
NbLr  LbNr
ð7:54Þ
Unfortunately, the 2-DOF spiral approximation tends to yield poor results. It
does, however, provide insight into stability parameters and design features that
affect the spiral mode.
7.3.3.4 	Two-degree-of-freedom dutch roll approximations. 	The dutch
roll mode is probably the most difficult aircraft dynamic mode to analyze. Several
2-DOF approximations are possible for the dutch roll based on which simplifying
assumptions are made. In many cases, it is best to look at an estimate of the
absolute value of the ratio of roll angle to sideslip jf=bj present during a dutch
roll oscillation to help guide dutch roll approximation assumptions. It is basically
the ratio of the numerator of the fðsÞ=dðsÞ transfer function to the numerator of
the bðsÞ=dðsÞ transfer function evaluated at the specific damping ratio and damped
frequency conditions. The f=b ratio tells us if the dutch roll is composed of
mostly yawing motion, mostly rolling motion, or approximately equal excursions
of each. f=b can be visualized by thinking about the pattern a wing tip light
traces as the aircraft goes through a dutch roll oscillation. If the pattern is a
horizontal ellipse (major axis horizontal), f=b is less than 1 and the roll angle
excursions are low compared to the sideslip excursions. If the wing tip pattern is a
circle, f=b is approximately 1. A vertical ellipse pattern indicates f=b greater
than 1 and the aircraft is considered ‘‘rolly’’, generally because of a high degree
of lateral stability. This last case is usually objectionable for precision tracking
tasks. The approximation
f
b  Clb
C nb
I zz
I xx
1
rU1
" 	#
ð7:55Þ
will give us an estimate of f=b as a start. We will look at three different
approximations for dutch roll dynamic characteristics based on this estimate.
Test Pilot School approximation. 	This approximation is used by the USAF
Test Pilot School and assumes the dutch roll motion is mostly sideslip (jf=bj very
low). It is believed that the approximations for damping ratio and natural
frequency are based on experience.
zDR  1
8
ffiffiffiffiffiffiffiffiffiffi
2Sb3
p 	
ðCn r Þ r
I zz Cnb
!1=2
on DR  Sb
2
 	1=2
U1
C nb r
I zz
 	1=2 ð7:56Þ
AIRCRAFT DYNAMIC STABILITY 	351

-- 367 of 650 --

Two-degree-of-freedom approximation for low f=b. 	Here again, the assump-
tion is made that the motion consists primarily of sideslipping and yawing. This is
generally the case for aircraft with relatively low lateral stability (C lb ). This
approximation eliminates the f motion variable and the rolling moment equation
from Eq. (7.44). The result is
ðsU1  YbÞ 	sðU1  YrÞ
Nb 	s2  sN r
 	 bðsÞ
cðsÞ
 	
¼ Yda 	Ydr
Nda 	Ndr
 	 daðsÞ
drðsÞ
 	
The characteristic equation is obtained from the determinant of the first matrix
s s2  s N r þ Yb
U1
 	
þ YbNr
U1
þ Nb  NbYr
U1
 		 	
¼ 0
and natural frequency and damping ratio are obtained in the usual manner
on DR 
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
fNb þ 1
U1
ðYbNr  NbYrÞg
s
zDR ¼
 Nr þ Yb
U1
 	
2on d
ð7:57Þ
With the previous approximation equations, the strong influence of directional
stability (Nb) and yaw damping (Nr) can be seen.
Two-degree-of-freedom approximation for high f=b. 	This approximation
makes the assumption that the dutch roll consists primarily of rolling motion.
This may be the case for aircraft with high lateral stability. The c motion variable
and the yawing moment equation are eliminated from Eq. (7.44).
sU1  Yb 	sðY p þ gÞ
Lb 	s2  L p s
 	 bðsÞ
fðsÞ
 	
¼ Yda 	Ydr
Lda 	Ldr
 	 daðsÞ
drðsÞ
 	
and, after a few simplifications (Yp and €ff negligible), the significant character-
istic equation becomes
ðsU1  YbÞðL p sÞ  ðgÞðLbÞ ¼ 0
or
s2  Yb
U1
s þ g
U1
Lb
Lp
¼ 0
352 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 368 of 650 --

We then have
on DR 
ffiffiffiffiffiffiffiffiffiffiffiffiffi
g
U1
Lb
Lp
s
zDR   Yb
U1
ffiffiffiffiffiffiffiffiffiffiffiffiffi
U1
g
L p
Lb
s 	ð7:58Þ
Notice the strong influence of lateral stability (Lb) and roll damping (L p) in the
previous equations.
The three approximations presented for estimating dutch roll dynamic char-
acteristics all have significant limitations because of the highly coupled motion
of the dutch roll. A 3-DOF solution is generally preferred when analyzing the
dutch roll.
Example 7.13
Using the same aircraft and flight condition as in Example 7.10, the six
lateral-directional transfer functions for the Lear Jet are approximated by
bðsÞ
daðsÞ ¼ ð4:184Þs2 þ ð5:589Þs þ 0:363
ð674:9Þs4 þ ð421:2Þs3 þ ð1808Þs2 þ ð897:9Þs þ 0:903
fðsÞ
daðsÞ ¼ ð79:59Þs2 þ ð14:24Þs þ 189:3
ð674:9Þs4 þ ð421:2Þs3 þ ð1808Þs2 þ ð897:9Þs þ 0:903
cðsÞ
daðsÞ ¼ ð4:189Þs3 þ ð2:150Þs2  ð0:150Þs þ 8:991
s½ð674:9Þs4 þ ð421:1Þs3 þ ð1808Þs2 þ ð897:9Þs þ 0:903
bðsÞ
drðsÞ ¼ ð0:185Þs3 þ ð18:16Þs2 þ ð8:285Þs  0:0933
ð674:9Þs4 þ ð421:2Þs3 þ ð1808Þs2 þ ð897:9Þs þ 0:903
fðsÞ
drðsÞ ¼ ð8:188Þs2  ð2:045Þs  53:85
ð674:9Þs4 þ ð421:2Þs3 þ ð1808Þs2 þ ð897:9Þs þ 0:903
cðsÞ
drðsÞ ¼ ð18:08Þs3  ð8:921Þs2  ð0:4481Þs þ 2:559
s½ð674:9Þs4 þ ð421:2Þs3 þ ð1808Þs2 þ ð897:9Þs þ 0:903
Find the time constant for the roll and spiral modes and the natural frequency,
damping ratio, damped frequency, time constant, and period of oscillation for
the dutch roll modes.
The characteristic equation is
674:9s4 þ 421:2s3 þ 1808s2 þ 897:9s þ 0:903 ¼ 0
AIRCRAFT DYNAMIC STABILITY 	353

-- 369 of 650 --

or, in standard form
s4 þ 0:6241s3 þ 2:6789s2 þ 1:3304s þ 0:001338 ¼ 0
Using a root solver such as that available in MATLAB, we have two real roots
and one pair of complex conjugates:
s1 ¼ 0:00101 ¼ sSPIRAL 	ðsmaller real rootÞ
s2 ¼ 0:507 ¼ sROLL 	ðlarger real rootÞ
s3;4 ¼ 0:0580  j1:617 ¼ zDRoN DR  joD DR
With these roots, the characteristic equation can be written as
ðs þ 0:00101Þðs þ 0:507Þðs2 þ 0:116s þ 2:618Þ ¼ 0
For the roll mode, we have:
tROLL ¼  1
0:507 s ¼ 1:972 s
For the spiral mode, the root is stable (negative) so we have
tSPIRAL ¼  1
0:00101 s ¼ 991:8 s
And for the dutch roll, we have:
oD DR ¼ 1:617 rad=s
oN DR ¼ 1:618 rad=s
zDR ¼ 0:036
tDR ¼  1
zoN
¼  1
0:058 ¼ 17:24 s
TDR ¼ 2p
oDDR
¼ 2p
1:617 ¼ 3:88 s
Example 7.14
Use the 1-DOF roll approximation, the 2-DOF spiral approximation, and the
three dutch roll approximations to approximate the lateral-directional stability
characteristics for the Lear Jet. Compare to the 3-DOF values obtained in
Example 7.13.
354 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 370 of 650 --

For the roll approximation, we use Eq. (7.50) and recall that _ff ¼ p ¼ sf
pðsÞ
daðsÞ ¼ s fðsÞ
daðsÞ ¼ s Lda
sðs  LpÞ
Substituting in the values for the Lear Jet:
pðsÞ
daðsÞ ¼ 6:77
s þ 0:437
The time constant becomes:
tr ¼  1
0:437 ¼ 2:29 s 	ð1-DOF approximationÞ
Recalling that the 3-DOF roll time constant was 1.972 s, the approximation
compares within approximately 16%.
For the spiral mode, Eq. (7.53) yields: s ¼ 0:0065. For the time constant
we have
ts ¼  1
0:0065 ¼ 153:8 s 	ð2-DOF approximationÞ
The spiral approximation gives a poor prediction of spiral time constant when
compared to the 3-DOF value of 991.8 s.
For the dutch roll mode, we first use Eq. (7.55) to calculate
f
b ¼ 3:66
We next use the dutch roll approximations to obtain estimates for natural
frequency and damping ratio [using Eqs. (7.56–7.58)]. These results are
summarized in Table 7.3.
We can see that the Test Pilot School approximation gives reasonably good
values for both damping ratio and natural frequency. The 2-DOF low f=b ratio
approximation gives a close value for natural frequency but a poor prediction
Table 7.3 	Comparison of dutch roll 3-DOF and approximation
solutions
on 	z
Exact solution (3-DOF Case) 	1.618 rad=s 	0.036
1) Test Pilot School Approx. 	1.69 rad=s 	0.033
2) DOF Approx. Low jf=bj 	1.62 rad=s 	0.058
3) 2 DOF Approx. High jf=bj 	0.68 rad=s 	0.062
AIRCRAFT DYNAMIC STABILITY 	355

-- 371 of 650 --

for damping ratio. The 2-DOF high f=b approximation has poor predictions
for both natural frequency and damping ratio (despite this being a relatively
high f=b case). The limitations of each approximation are, of course, directly
related to the assumptions made.
7.4 	Dynamic Stability Guidelines
In designing an aircraft, there are several guidelines available for natural
frequency, damping ratio, and=or time constant for each of the dynamic
modes. These guidelines are based on approximately the past half century of
flying experience. Dynamic stability characteristics directly affect the ‘‘flyabil-
ity’’ or handling qualities of an aircraft. The interface between the human pilot
(with physical and mental limitations) and inherent aircraft response character-
istics must allow for accomplishment of mission objectives throughout the
flight envelope. Precision tasks such as landing approach, tracking, and forma-
tion flying can only be accomplished successfully if the aircraft’s dynamic
stability characteristics are within acceptable ranges. These ranges are usually
presented in terms of the dynamic characteristics we have discussed. Of
course, another aspect of acceptable aircraft handling qualities involves suffi-
cient control authority (usually referred to as control power) to trim and
maneuver the aircraft throughout the flight envelope. We will focus on accepta-
ble dynamic stability characteristics as presented in a Military Specification
(MIL-F-8785C). 1 Although this specification is no longer a requirement for
military aircraft, it does provide a good reference for the designer and estab-
lishes the concept of flying qualities levels. Another specification is published
for civilian aircraft in Federal Aviation Requirement (FAR) documents.
The advent of modern high-performance aircraft with high-authority control
augmentation systems (F-15) and fly-by-wire control systems (F-16 and F-22)
has resulted in dynamic stability characteristics that do not conform to classic
first- and second-order responses. Military Standard 1797 is currently used to
address these advances. However, for purposes of this text, MIL-F-8785C
provides a good first step in the discussion of acceptable dynamic stability
characteristics.
7.4.1 	Aircraft Class
Acceptable flying qualities are a function of the size and mission of an
aircraft. To account for this, MIL-F-8785C specifies four classes of aircraft as
presented in Table 7.4. The determination of aircraft class is usually the first
step in utilization of MIL-F-8785C.
7.4.2 	Flight Phase Category
MIL-F-8785C dynamic stability requirements also are a function of the
flight phase, or mission segment, that an aircraft is engaged in because differ-
ent demands are placed on the pilot. For example, air-to-ground tracking
requires a higher degree of dutch roll damping than cruising flight. The differ-
ent flight phases may also be associated with different dynamic pressure condi-
tions, which have a direct effect on dynamic stability characteristics. Table 7.5
356 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 372 of 650 --

presents the three flight phase categories into which MIL-F-8785C divides all
mission segments for military aircraft. Terminal refers to the takeoff and land-
ing phases accomplished in a terminal area. Normally, the gear and flaps down
configuration is associated with the terminal flight phase (Category C), while
the gear and flaps up configuration is associated with Category A and B.
When no flight phase category is stated in a dynamic stability requirement,
that requirement applies to all three categories.
7.4.3 	Flying Quality Levels
An aircraft’s compliance to the dynamic stability requirements of MIL-
8785C is defined in terms of three flying quality levels. These are summarized
in Table 7.6.
Level 1 is the highest level of flying qualities and is the requirement within
the operational flight envelope with all aircraft systems in their normal operat-
ing state. It is important to define the term operational flight envelope. Flight
envelopes are usually defined by boundaries of speed, altitude, load factor,
angle of attack, and=or sideslip. The operational flight envelope is the inner-
most or inside envelope when compared with the boundaries of the service
Table 7.4 	MIL-F-8785C aircraft classes
Class 	General aircraft types 	Specific examples
Class I 	Light utility 	T-41
small, light 	Primary trainer 	T-6
airplanes 	Light observation 	O-1, O-2
Class II 	Heavy utility=search and rescue 	C-21
medium 	Light or medium transport=cargo=tanker 	C-130
weight; low-to- 	Early warning=ECM=Command & control 	E-2
medium 	Anti-submarine 	S-3A
maneuverability 	Assault transport 	C-130
airplanes 	Reconnaissance 	U-2
Tactical bomber 	B-66
Heavy attack 	A-6
Trainer for Class II 	T-1A
Class III 	Heavy transport=cargo=tanker 	KC-10, C-17
large, heavy, 	Heavy bomber 	B-52, B-1, B-2
low-to-medium 	Patrol=Early warning=ECM=Command & control 	P-3, SR-71
maneuverability 	Trainer for Class III 	TC-135
airplanes
Class IV 	Figher=Intecepter 	F-22, F-15, F-16
high- 	Attack 	F-15E, A-10
maneuverability 	Tactical reconnaissance 	RF-4
airplanes 	Observation 	OV-10
Trainer for Class IV 	T-38
AIRCRAFT DYNAMIC STABILITY 	357

-- 373 of 650 --

flight envelope and the permissible flight envelope (to be discussed later in this
section). The boundaries of the operational flight envelope are set by mission
requirements. Expected missions are analyzed to determine what speed, alti-
tude, load factor, angle of attack, and=or sideslip ranges will be needed to
accomplish each mission, and this information is used to define the operational
flight envelope.
Level 2 implies an increase in pilot workload and=or a degredation in
mission effectiveness because of decreased dynamic stability (or control power)
characteristics. Level 2 is considered acceptable when the cumulative probabil-
ity of all failure states that could result in Level 2 flying qualities within the
operational flight envelope is less than once every 100 flights. For example, an
aircraft has ten failure states that result in Level 2 flying qualities in the opera-
Table 7.5 	MIL-F-8785C flight phase categories
Category A 	Those nonterminal flight phases that require rapid maneuvering, precision
tracking, or precise flight-path control. Included in this category are:
(a) Air-to-air combat (CO) 	(f) In-flight refueling (receiver) (RR)
(b) Ground attack (GA) 	(g) Terrain following (TF)
(c) Weapon delivery=launch (WD) (h) Antisubmarine search (AS)
(d) Aerial recovery (AR) 	(i) Close formation flying (FF)
(e) Reconnaissance (RC)
Category B 	Those nonterminal flight phases that are normally accomplished using
gradual maneuvers and without precision tracking, although accurate
flight-path control may be required. Included in this category are:
(a) Climb (CL) 	(e) Descent (D)
(b) Cruise (CR) 	(f) Emergency descent (ED)
(c) Loiter (LO) 	(g) Emergency deceleration (DE)
(d) In-flight refueling (tanker) (RT) 	(h) Aerial delivery (AD)
Category C 	Those terminal flight phases that are normally accomplished using gradual
maneuvers and which usually require accurate flight-path control.
Included in this category are:
(a) Takeoff (TO) 	(d) Wave-off=go-around (WO)
(b) Catapult takeoff (CT) 	(e) Landing (L)
(c) Approach (PA)
Table 7.6 	MIL-F-8785C flying quality levels
Level 1 	Flying qualities clearly adequate for the mission flight phase
Level 2 	Flying qualities adequate to accomplish the mission flight phase, but some
increase in pilot workload or degradation in mission effectiveness, or both,
exists
Level 3 	Flying qualities such that the airplane can be controlled safely, but pilot
workload is excessive or mission effectiveness is inadequate, or both.
Category A flight phases can be terminated safely, and Category B and C
flight phases can be completed
358 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 374 of 650 --

tional flight envelope, two of which each have a probability of 5  103=flight,
and the other eight each have probabilities of 1  103=flight. Such a situation
fails the MIL-F-8785C requirement because the cumulative probability is
1:8  102=flight, nearly twice the allowable limit. The reliability of these fail-
ure states would have to be improved to meet the cumulative requirement.
Level 3 requires that control of the airplane is maintained but allows exces-
sive pilot workload and=or inadequate mission effectiveness. It is basically a
‘‘get home’’ level and is considered acceptable when the cumulative probability
of all failure states that result in Level 3 in the operational flight envelope is
less than once every 10,000 flights, and the cumulative probability of all failure
states that result in Level 3 in the service flight envelope is less than once
every 100 flights. Before defining the service flight envelope, we will define
the outermost flight envelope, the permissible flight envelope. The boundaries
of the permissible flight envelope are set by aircraft performance and safety
limits. The aircraft either is not capable of exceeding these limits, or, if it can
exceed these limits, potentially catastrophic failures may occur (such as struc-
tural failure or engine failure) when beyond these limits. The boundaries of the
service flight envelope are between the operational flight envelope and the
permissible flight envelope (that is, its boundaries contain the operational flight
envelope but it is contained within the permissible flight envelope). Outside the
service flight envelope, but within the permissible flight envelope, the handling
qualities with the aircraft systems in the normal state are expected to be at
least recoverable. This means that controlled flight may be temporarily lost (as
in a stall), but the pilot can safely return to the service flight envelope and
regain control. The service flight envelope basically acts as a safety margin
between the operational flight envelope and the permissible flight envelope.
The handling qualities of an aircraft may degrade as it nears the limits of the
permissible flight envelope, but we want the degradation to be gradual, not
sudden. Level 2 handling qualities are generally the minimum requirement,
with all systems in the normal state, within the service flight envelope but
outside the operational flight envelope. This ensures that the pilot has handling
qualities good enough to avoid entering or exceeding the permissible flight
envelope inadvertently. A level better than the one specified is also considered
acceptable for a given failure situation. Section 7.3.5 will discuss the Cooper-
Harper rating scale for aircraft flying qualities which has a direct correlation to
the MIL-F-8785C levels discussed here. A simplified decision process for
using MIL-F-8785C is presented in Fig. 7.18.*
7.4.4 	Short Period
Dynamic stability guidelines for the short period mode are covered in two
documents. Both will be addressed in this section.
7.4.4.1 	MIL-F-8785C. 	MIL-F-8785C requires that the short period mode
meet both a damping ratio and natural frequency requirement. The equivalent
damping ratio requirements are presented in Table 7.7 and are a function of
*Private communication with D. Leggett, Dec. 1999.
AIRCRAFT DYNAMIC STABILITY 	359

-- 375 of 650 --

category. The term equivalent is used so that aircraft with high authority
augmentation systems or fly-by-wire systems can also be included. These aircraft
have dynamic response characteristics (by design) that are significantly different
from those of the basic airframe.
MIL-F-8785C requires that the short period natural frequency fall within an
upper and lower limit as a function of the aircraft’s n=a ratio and flight phase
category. Figures 7.19–7.21 present the Level 1, 2, and 3 regions for short
period natural frequency by category. Notice the logarithmic scale for n=a.
This parameter can be estimated for an aircraft using
n
a   Za
g ð7:59Þ
n=a can be thought of as a load factor (n) sensitivity parameter. It increases
with increases in CLa and wing area, and it decreases as weight increases.
The MIL-F-8785C short period requirement will be satisfied if the roots of
the short period mode fall within a region on the s plane. In general terms, this
region is presented as the crosshatched area in Fig. 7.22.
Fig. 7.18 	Simplified decision process for using MIL-F-8785C.
Table 7.7 	Short period damping ratio (zSP ) limits
Category A and C flight phases 	Category B flight phases
Minimum 	Maximum 	Minimum 	Maximum
Level 1 	0.35 	1.30 	0.30 	2.00
Level 2 	0.25 	2.00 	0.20 	2.00
Level 3 	0.15* 	no maximum 	0.15* 	no maximum
* May be reduced at altitudes above 20,000 ft if approved by the procuring activity.
360 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 376 of 650 --

7.4.4.2 	MIL-STD-1797A. 	MIL-STD-1797A provides almost identical
requirements for the short period mode to those presented in MIL-F-8785C.
The terms ‘‘equivalent frequency’’ and ‘‘equivalent damping ratio’’ are used, as
with MIL-F-8785C, to account for the dynamics experienced by highly augmen-
ted aircraft. The concepts of short period natural frequency and damping ratio are
retained when using these guidelines. The MIL-STD-1797A short period require-
ments are recast in terms of the control anticipation parameter (CAP) over an
Fig. 7.19 	MIL-F-8785C short period natural frequency requirements—Category A
flight phases.
AIRCRAFT DYNAMIC STABILITY 	361

-- 377 of 650 --

acceptable range of damping ratios. The CAP is estimated as
CAP  o2
nsp
n=a ð7:60Þ
The CAP is represented on Figs. 7.19, 7.20, and 7.21 as the sloped boundaries
of the Level 1, 2, and 3 regions. MIL-STD-1797A presents short-period
compliance regions in terms of the CAP (which is directly proportional to the
Fig. 7.20 	MIL-F-8785C short period natural frequency requirements—Category B
flight phases.
362 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 378 of 650 --

square of short period natural frequency) and damping ratio using Fig. 7.23.
The 	only difference 	between 	the 	MIL-F-8785C 	requirements 	and 	those
presented in Fig. 7.23 is that MIL-STD-1797A has dropped the lower Level 3
CAP limit. For the short period, these equivalent system requirements work
well for highly augmented aircraft as long as the aircraft has a classical-looking
response such as with an a-command, q-command, or g-command system (see
Chapter 9). They do not work well for nonclassical response types such as
Fig. 7.21 	MIL-F-8785C short period natural frequency requirements—Category C
flight phases.
AIRCRAFT DYNAMIC STABILITY 	363

-- 379 of 650 --

y-command or flight path command systems. Consequently, MIL-STD-1797A
also contains requirements on frequency-response shape that are not defined as
a function of the classical dynamic modes discussed in this text.3
The level boundaries in Figs. 7.19–7.21 are specified in MIL-STD-1797A
using Table 7.8.
In practice, the parameter of equivalent time delay must be considered when
applying either MIL-F-8785C or MIL-STD-1797A. Only a snapshot of MIL-
STD-1797A has been presented in this section. A detailed reading of this
document is necessary for application to an actual aircraft design or flight test
evaluation.
7.4.5 	Phugoid
MIL-F-8785C has only a requirement on damping ratio for the phugoid
mode. This requirement is independent of class and category and is presented
in Table 7.9.
For Level 3, the phugoid mode is allowed to be unstable as long as the time
to double amplitude is greater than or equal to 55 s. Equation (7.49) can be
used to compute T2 . Under Level 3 conditions, a phugoid with neutral or posi-
tive stability will always satisfy the Level 3 requirement. The phugoid require-
ment is not very demanding because the phugoid is a low-frequency mode that
generally has little effect on precision tasks. The pilot typically has sufficient
time to correct for any undesirable phugoid characteristics. However, it can be
important during unattended or divided-attention operation of the aircraft.
Figure 7.24 presents the acceptable region for Level 1 phugoid roots on the s
plane.
7.4.6 	Roll
MIL-F8785C specifies maximum limits on the roll mode time constant (tr)
which depend on class and category. Table 7.10 presents these requirements.
Fig. 7.22 	S-plane MIL-F-8785C short period compliance region.
364 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 380 of 650 --

Fig. 7.23
 
MIL-STD-1797A short-period dynamic requirements.
AIRCRAFT DYNAMIC STABILITY 	365

-- 381 of 650 --

Table 7.9 	Phugoid damping
requirements
Level 1 	z > 0:04
Level 2 	z > 0
Level 3 	T2  55 s
Table 7.8 	Additional short-period dynamic requirements
Flight 	Aircraft 	Level 1 	Level 2 	Level 3
phase 	class
category
A 	All 	osp  1 rad=s 	osp  0:6 rad=s 	zsp  0:15 may be relaxed
above 20,000 ft
B 	All 	T2 , the time to double
amplitude based on the
unstable root, should be
no less than 6 s. In the
presence of any other
Level 3 flying qualities,
zsp should be at least
0.05.
C 	I, II- C, 	osp  0:87 rad=s 	osp  0:6 rad=s
IV 	n=a  2:7 g=rad 	n=a  1:8 g=rad
II-L, III 	osp  0:7 rad=s 	osp  0:4 rad=s
n=a  2:0 g=rad 	n=a  1:0 rad
Fig. 7.24 	S-plane MIL-F-8785C phugoid level 1 compliance region.
366 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 382 of 650 --

Recalling Eq. (7.48), the roll mode root of the characteristic equation is
s ¼  1
tr
and the compliance region for the roll mode root becomes
s <  1
trmax
Because the roll mode is first order, the root will lie on the negative real axis
and the compliance region as shown in Fig. 7.25.
By specifying a maximum roll mode time constant, MIL-F-8785C is essen-
tially specifying that the step response of the roll mode must be faster than or
equal to the time constant value specified.
7.4.7 	Spiral
MIL-F-8785C specifies that the spiral mode meet the requirements for the
time to double amplitude of the bank angle as presented in Table 7.11 for bank
angle disturbances of up to 20 deg. Therefore, an unstable spiral is acceptable
if the time to double amplitude is slow enough. Obviously, any stable spiral
(negative root of the characteristic equation) is Level 1. The normal flight test
Table 7.10 	Maximum roll mode time constant (seconds)
Flight phase 	Class 	Level 1 	Level 2 	Level 3
category
A 	I and IV 	1.0 	1.4 	10
II and III 	1.4 	3.0 	10
B 	All 	1.4 	3.0 	10
C 	I, II-C, and IV 	1.0 	1.4 	10
II-L and III 	1.4 	3.0 	10
Fig. 7.25 	S-plane MIL-F-8785C roll mode compliance region.
AIRCRAFT DYNAMIC STABILITY 	367

-- 383 of 650 --

approach to evaluate the spiral is to trim the aircraft for wings-level, zero-yaw
rate flight and then bank the aircraft to a 20-deg roll angle and neutralize the
controls. If the time to 40 deg is less than the time specified in Table 7.11,
then the spiral requirements of MIL-F-8785C are not met.
Recalling Eq. (7.49), the spiral mode root of the characteristic for an
unstable spiral is equal to:
s ¼ 0:693
T2
Therefore, the compliance region for the spiral root in the s plane becomes
everything on the real axis to the left of:
s ¼ 0:693
T2min
The spiral compliance region is shown in Fig. 7.26.
7.4.8 	Dutch Roll
The MIL-F-8785C requirements for the dutch roll consist of a minimum z,
a minimum oN , and a minimum zoN , as shown in Table 7.12. The table must
Table 7.11 	MIL-F-8785C spiral mode
minimum time to double amplitude
Flight phase 	Level 1 	Level 2 	Level 3
category
A and C 	12 s 	8 s 	4 s
B 	20 s 	8 s 	4 s
Fig. 7.26 	MIL-F-8785C spiral compliance region.
368 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 384 of 650 --

be modified if o2
Djf=bjDR > 20 rad 2=s 2 by increasing the zoN requirement
(details are provided in MIL-F-8785C).
A generalized compliance region for dutch roll roots is presented as the
shaded area of Fig. 7.27.
Example 7.15
For the Lear Jet in cruise using the same flight condition (40,000 ft and
M ¼ 0:7) and data used in Examples 7.10 and 7.12, determine if the aircraft
satisfies the dynamic stability requirements of MIL-F-8785C for Level 1.
To start the evaluation, we must first determine the aircraft class and cate-
gory:
Class II; Category B ðCruiseÞ
Table 7.12 	Minimum dutch roll frequency and damping
Flight phase 	Minimum 	Minimum 	Minimum
Level 	category 	Class 	z* 	zoN ,* rad=s 	oN , rad=s
A (CO, GA, RR, TF,
RC, FF, and AS)
I, II, III, and IV 	0.4 	0.4 	1.0
A 	I and IV 	0.19 	0.35 	1.0
1 	II and III 	0.19 	0.35 	0.4
B 	All 	0.08 	0.15 	0.4
C 	I, II-C, and IV 	0.08 	0.15 	1.0
II-L and III 	0.08 	0.10 	0.4
2 	All 	All 	0.02 	0.05 	0.4
3 	All 	All 	0 	— 	0.4
* The governing damping requirement is that yielding the larger value of zd , except that a zd of 0.7 is
the maximum required for Class III aircraft.
Fig. 7.27 	S-plane MIL-F-8785C dutch roll compliance region.
AIRCRAFT DYNAMIC STABILITY 	369

-- 385 of 650 --

Longitudinal Modes of Motion:
Short Period:
From Example 7.10,
on sp ¼ 2:836 rad=s
zSP ¼ 0:335
Referring to Table 7.7, because zsp > 0:3 and zsp < 2:0, the Lear Jet passes the
damping ratio requirement at Level 1.
To evaluate on sp for compliance, we need to determine n=a. From Eq.
(7.59), and knowing that Za is equal to 451:7 ft=s 2 for this aircraft and flight
condition, we have
n
a ¼  Za
g ¼ 451:7
32:2 ¼ 14:03 g=rad
Using Fig. 7.20 for a Category B Flight Phase, we plot onSP at an n=a ¼
14:03. The point falls within the Level 1 compliance region and therefore
passes the Level 1 short period natural frequency requirement. Because the
Lear Jet passes both short period dynamic stability requirements at Level 1,
the Lear Jet’s short period dynamic characteristics are considered Level 1.
Phugoid:
From Example 7.10,
zPH ¼ 0:076
Referring to Table 7.9, zPH > 0:04 and the Level 1 phugoid requirement is
passed.
The Lear Jet (at this flight condition), therefore, meets the MIL-F-8785C
Level 1 dynamic stability requirements for the longitudinal modes of motion
(short period and phugoid).
Lateral-Directional Modes of Motion:
Roll:
From Example 7.12,
tr ¼ 1:972 s
Using Table 7.10 for Category B, tr > 1:4 s and it fails the Level 1 require-
ment. Because tr < 3 s, it passes Level 2. Therefore, the roll mode is Level 2.
Spiral:
From Example 7.12, the spiral mode is stable (s ¼ 0:00101) with a time
constant of
ts ¼ 991:8 s
370 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 386 of 650 --

Because the spiral is stable, the time-to double-amplitude requirements of
Table 7.11 are automatically met. Therefore the Lear Jet spiral mode passes the
Level 1 MIL-F-8785C dynamic stability requirement.
Dutch Roll:
From Example 7.12,
oN DR ¼ 1:168 rad=s
zDR ¼ 0:036
Referring to Table 7.12, we will look at the dutch roll damping ratio require-
ment first.
zDR ¼ 0:036 < 0:08;
so it fails Level 1. Because
zDR ¼ 0:036 > 0:02
it passes Level 2.
We will next look at the Table 7.12 requirement for zDRoN DR. This product
must be greater than 0.15 to pass Level 1. For our case,
zDRoN DR ¼ 0:0582 < 0:15
therefore, it fails Level 1 for this requirement. Because zDRoN DR > 0:05 it
barely passes Level 2.
Finally, we must look at the dutch roll natural frequency requirement in
Table 7.12. We have
oN DR ¼ 1:618 rad=s > 0:4 rad=s
therefore, the Lear Jet meets the Level 1 dutch roll natural frequency require-
ment.
The Lear Jet dutch roll mode is rated Level 2 based on failing the Level 1
zDRoN DR dynamic stability requirement in MIL-F-8785C.
The Lear Jet lateral-directional mode is rated Level 2 based on both the
dutch roll and roll mode characteristics being rated Level 2.
Overall, the Lear Jet meets MIL-F-8785C Level 2 dynamic stability require-
ments because of the dutch roll and roll mode characteristics.
7.5 	Cooper–Harper Ratings
All of the previous discussion on dynamic stability guidelines may imply
that good aircraft handling qualities are simply a matter of satisfying published
criteria on parameters such as natural frequency, damping ratio, and time
constant for each of the dynamic modes. Nothing could be further from the
truth. The criteria discussed provides a starting point for designers and a tool
for flight testers to evolve the handling qualities of an aircraft. A vital contribu-
AIRCRAFT DYNAMIC STABILITY 	371

-- 387 of 650 --

tion to this evolution is pilot comments obtained from simulations and test
flying of the aircraft. A structured rating scale for aircraft handling qualities
was developed by NASA in the late 1960s called the Cooper–Harper rating
scale. This rating scale applies to specific pilot-in-the-loop tasks such as air-to-
air tracking, formation flying, and approach. It does not apply to open-loop
aircraft characteristics such as yaw response to a gust. An important part of
using the Cooper–Harper rating scale is careful definition of the evaluation
task and performance standards for that task. Figure 7.28 presents the Cooper–
Harper rating scale.
The Cooper–Harper rating scale is a decision tree for pilots to rate a speci-
fic mission task. The pilot begins the decision process at the lower left corner.
Aircraft controllability, pilot compensation (workload), and task performance
are key factors in the pilot’s evaluation. A Cooper–Harper rating of ‘‘one’’ is
the highest or best and a rating of ‘‘ten’’ is the worst, indicating the aircraft
cannot be controlled during a portion of the task and that improvement is
mandatory. It is important to observe that a Cooper–Harper rating of one
through three generally corresponds to Level 1 flying qualities, a rating of four
through six corresponds to Level 2 flying qualities, and a rating of seven
through nine corresponds to Level 3.
It should be understood that two different test pilots may rate the same
mission task differently based on different experience levels and aircraft back-
ground. This is to be expected, and generally the discussions that evolve based
on differences in the ratings help further define the nature of the handling
qualities for that aircraft.
With today’s highly augmented aircraft, adjustments can be made within the
flight control system during the development phases to achieve nearly optimal
dynamic stability characteristics. In this process, the pilot comments, using the
Cooper–Harper rating scale, play an important role along with MIL-F-8785C
and MIL-STD1797A.
7.6 	Experimental Determination of Second-Order Parameters
For second-order oscillatory responses, several methods are available to
experimentally determine key dynamic stability parameters such as damping
ratio and natural frequency. Two such methods will be discussed, both of
which require a time history of a key aircraft motion parameter for that mode.
The time history is normally obtained in flight test by trimming the aircraft
and then exciting the mode with a control doublet (a cyclic control input that
perturbs the aircraft on both sides of the trim condition). The time history
needed begins immediately after the doublet stops and is often referred to as
the free response or transient response. For example, for the short period
mode, the aircraft would be trimmed and a flight test data acquisition system
would be activated to record a time history of angle of attack and=or pitch
rate. The pilot would input a doublet (a quick pitch stick input: forward–aft–
neutral) and the time history needed would begin when the stick is returned to
the neutral or trimmed position.
372 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 388 of 650 --

Fig. 7.28
 
Cooper–Harper rating scale.
AIRCRAFT DYNAMIC STABILITY 	373

-- 389 of 650 --

7.6.1 	Log Decrement Method
If the transient response has three or more overshoots, the log decrement
method (also called the subsidence ratio or the transient peak ratio method)
can be used. The value of each peak deviation from the trim condition (DX0 ,
DX1 , DX2 , etc.) is measured as shown in Fig. 7.29.
Next, the transient peak ratios, such as DX1=DX0 , DX2=DX1 , DX3=DX2 , are
determined, and Fig. 7.30 is used to determine corresponding values for damp-
ing ratio (z1 , z2 , z3 , etc.). The average of these values is used to determine the
overall z.
The period, T, is determined based on a full cycle of an oscillation as
shown in Fig. 7.29. The damped frequency can then be found using
oD ¼ 2p
T
and the natural frequency can be found using
oN ¼ oD	
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
p
7.6.2 	Time Ratio Method
If the transient response has two or less overshoots, the time ratio method
is appropriate. A well-defined, free-response oscillation is selected and then the
amplitude of the peak is used to determine the time to 73.6%, 40.9%, and
19.9% of the peak value as show in Fig. 7.31.
Each of these values (t1 , t2 , and t3 ) is then used to form the ratios:
t2
t1
; t3
t1
; 	and ðt3  t2Þ
ðt2  t1Þ :
Fig. 7.29 	Log decrement method relationships.
374 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 390 of 650 --

Figure 7.32 is then entered on the time ratio (right) side to find the correspond-
ing damping ratio for each time ratio. These values are then averaged to deter-
mine the overall z. With the overall z, Fig. 7.32 is then re-entered to obtain the
frequency time products oN t1 , oN t2 , and oN t3 . To determine the natural
frequency, compute
oN1 ¼ oN t1
t1
; 	oN2 ¼ oN t2
t2
; 	oN3 ¼ oN t3
t3
Fig. 7.30 	Transient peak ratio vs damping ratio–log decrement method.
Fig. 7.31 	Time ratio method relationships.
AIRCRAFT DYNAMIC STABILITY 	375

-- 391 of 650 --

Fig. 7.32
 
Frequency time product and time ratio vs damping ratio–time ratio method.
376 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 392 of 650 --

oN1 , oN2 , and oN3 	are then averaged to determine the overall natural
frequency.
7.6.3 	Test Pilot Approximation for Damping Ratio
To obtain a rough estimate of the damping ratio for the short period and
dutch roll modes, test pilots sometimes use the following approximation which
lends itself to easy application in flight:
z  7  ðnumber of over=undershootsÞ
10 ð7:61Þ
The number of over=undershoots during the free response is counted by the
pilot after the doublet is finished, and simple mental arithmetic in flight using
the approximation will lead to an approximate value of the damping ratio. The
approximation is only applicable to situations where the number of free
response over=undershoots is less than seven. If seven or more over=under-
shoots are experienced and the response eventually damps out, the pilot may
only conclude that the damping ratio is somewhere between 0 and 0.1, and
that the response is lightly damped.
Using the response of Fig. 7.31 as an example, the pilot would count two
peaks or over=undershoots. Using Eq. (7.61), the test pilot approximation
would yield an estimate of 0.5 for the damping ratio. Of course, more refined
methods such as the log decrement method or time ratio method are used after
time history plots are available.
7.7 	Historical Snapshot—The A-10A Prototype Flight Evaluation
The Air Force conducted a competitive flight evaluation of two prototype
close air support aircraft designs in 1972. The overall program was named the
‘‘A-X’’ Competitive Flyoff and the two competing aircraft were the Northrop
A-9A and the Fairchild Republic A-10A.3,4 Figures 7.33 and 7.34 present
Fig. 7.33 	A-9A prototype aircraft.
AIRCRAFT DYNAMIC STABILITY 	377

-- 393 of 650 --

Fig. 7.34 	A-10A prototype aircraft.
Fig. 7.35 	A-10A prototype short period dynamic stability characteristics.
378 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 394 of 650 --

Fig. 7.36 	A-10A prototype short period damping ratio and natural frequency
characteristics.
AIRCRAFT DYNAMIC STABILITY 	379

-- 395 of 650 --

pictures of these prototype aircraft, which had significantly different design
approaches to satisfy the same mission requirements.
The A-10 was declared the winner in 1973 and went on to full-scale
production of 733 aircraft. It also established its reputation for lethality, respon-
sivness, and survivability during the cold war years of the late 1970s through
1980s, and as a key aircraft in the destruction of tanks, artillery, ground vehi-
cles, and missile sites during the Gulf War.
During the A-X Competitive Flyoff, the flying qualities of both aircraft
were evaluated using techniques presented in this chapter. To evaluate the
dynamic longitudinal stability of the short period mode, elevator doublets were
performed at selected airspeed and altitude combinations to determine damping
ratio and natural frequency characteristics. Figure 7.35 presents a MIL-F-
8785C short period natural frequency compliancy plot for the A-10A.
Notice that the open symbols are for evaluations with the stability augmen-
tation system (SAS) on and the darkened symbols are with the SAS off. The
SAS is a system that enhances dynamic stability characteristics and will be
discussed in detail in Chapter 9. With the SAS on, the A-10’s short period
natural frequency characteristics clearly met Level 1 requirements. With the
SAS off, several points fell in the Level 2 category; however, this is permitted
by the MIL SPEC for a degraded system. Figure 7.36 presents A-10A short
period damping ratio characteristics along with natural frequency data.
Note that the A-10 also passed the Level 1 damping ratio requirement with
the SAS on, but several points are in the Level 2 category with the SAS off.
References
1 MIL-F-8785C, Flying Qualities of Piloted Airplanes, Military Specification, 1980.
2 Papa, J. A., Douglas, A. F., Markwardt, J. H., and Fortner, L. D., ‘‘A-10A Prototype
Task II Performance and Flying Qualities Evaluation,’’ Air Force Flight Test Center TR
73-7, Edwards AFB, CA, March 1973.
3 Yechout, T. R., Lucero, F. N., and Bridges, R. D., ‘‘Air Force Flight Evaluation of the A-
10A Prototype Aircraft,’’ Air Force Flight Test Center TR 73-3, Edwards AFB, CA, March
1973.
Problems
7.1 	Given the following system, determine the solution of the homogenous
equation (which is normally called either the complementary or transient
solution) for the given initial conditions:
5 _XX þ 2X ¼ 0
X ð0Þ ¼ 2
7.2 	Given the following equation for a mass–spring–damper system
M €XX þ C _XX þ KX ¼ KY
380 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 396 of 650 --

where we assume
(a) the system is massless
(b) the spring has an initial displacement of Y ¼ 10 in.
(c) the spring constant equals 5 lb=in.
(d) the damping coefficient equals 0.1 (lb-s=in.).
Given the initial condition, X ð0Þ ¼ 2, find
(1) the complementary or transient solution
(2) the particular or steady state solution
(3) the general or total solution
7.3 	Using the baseline system of Problem 7.2, find the general or total solu-
tion if the forcing function is not a constant (that is, step) but of the
form
f ðtÞ ¼ K sin ot
with o ¼ 2 rad=s.
7.4 	For Problem 7.2 (with the step input) find
(1) time constant
(2) time for the system to reach 98.2% of its final value
7.5 	For the following second-order system and initial conditions, find the
transient solution:
€XX þ 8 _XX þ 12X ¼ 15
X ð0Þ ¼ 2
_XX ð0Þ ¼ 2
7.6 	Given M ¼ 2, C ¼ 12, K ¼ 50, Y ¼ 2
(1) Write out the equation for a mass–spring–damper system where the
initial displacement is 2.
(2) Find the transient or complementary solution.
(3) Find the steady state or particular solution.
(4) Find the total or general solution.
(5) Evaluate the two unknown coefficients in the general solution given
the following initial conditions:
X ð0Þ ¼ _XX ð0Þ ¼ 0
AIRCRAFT DYNAMIC STABILITY 	381

-- 397 of 650 --

7.7 	Write out the general solution to Problem 7.6, Part (5), in the phase
angle form.
7.8 	Sketch the time response to Problem 7.7 by calculating X ðtÞ at the
following times:
t ¼ 0; 0:2; 0:5; 0:8; 1; 1:4; 1:7
What does the steady-state value appear to be? Does this agree with the
particular solution?
7.9 	For Problem 7.6, calculate the natural frequency (on), damping ratio (z),
and damped frequency (oD). Having done this, do the following
(1) Rewrite the expression for the mass–spring–damper system as a
function of damping and natural frequency.
(2) With damping calculated, would you expect an oscillatory type
response?
(3) Rewrite the answer to Problem 7.7 (which is in terms of the phase
angle) in the same form, but use the damping coefficient, natural and
damped frequency expressions.
(4) Because the time constant for a second-order system is t ¼ 1=zoN ,
how long would it take for the system to reach 63.2 and 98.2% of its
final value?
(5) Looking back at the sketch you made of this system’s response, do you
agree that at four time constants, the system is within plus or minus
2% of its final value?
7.10 	Given the following equation for a mass–spring–damper system
€XX þ 1:8 _XX þ 9X ¼ 9
What is the solution at t ¼ 0:3 s?
7.11 	Given the location of the following roots on the complex plane
Determine the time constant for the dutch roll, spiral, and roll modes. In
addition, determine the natural frequency and damping ratio of the
dutch roll mode.
382 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 398 of 650 --

7.12 	Match the following root locations on the complex plane:
with the following responses
7.13 	Determine the Laplace transform of the following functions (using the
transform table):
(1) 6e5t 	(2) 3e2t
(3) 1 	(4) 12 sin 5t
(5) €XX þ 2zon _XX þ o2
n X ¼ 0 	(6) €XX þ 2zon _XX þ o2
n X ¼ o2
n Y
Assume the initial conditions are zero for parts 5 and 6.
7.14 	Using the results of Problem 7.13, Part (6), write (in Laplace form) the
ratio of the output to input, X ðsÞ=Y ðsÞ.
7.15 	Find the inverse Laplace of
2:56
sðs2 þ 1:6s þ 2:56Þ at t ¼ 3 s
7.16 	Determine the partial fraction expansion and inverse transformation of
the following function.
FðsÞ ¼ s þ 2
sðs þ 3Þðs þ 1Þ
AIRCRAFT DYNAMIC STABILITY 	383

-- 399 of 650 --

7.17 	For the following AOA to elevator transfer function
aðsÞ
deðsÞ ¼ o2
n
ðs2 þ 2zon s þ o2
nÞ
Determine the steady-state value of AOA for a unit step elevator input
using the final value theorem.
7.18 	Show how you would go from the pitching moment differential equation
presented in Eq. (7.26) to its equivalent in Laplace and matrix form
Eq. (7.27).
7.19 	Given the 2-DOF short period approximation, Eq. (7.33), determine the
aðsÞ=deðsÞ transfer function using Matrix algebra.
7.20 	A Marine Corps A-4 flying at 15,000 ft, Mach 0.6 with an alpha trim of
3.4 deg, has the following short period characteristics:
short period damping ratio ¼ 0:304
short period natural frequency ¼ 3:69 rad=s
If the pilot has just made a unit step elevator input, calculate how long
it takes for the A-4 to reach the first overshoot, the magnitude of that
overshoot, and how long it takes for the A-4 angle of attack to be
within 2% of its final steady-state value. Assume a second-order
response.
7.21 	A Navy A-4 flying alongside the Marine Corps A-4 has the following
phugoid characteristics:
phugoid natural frequency ¼ 0:0635 rad=s
phugoid damping ratio ¼ 0:0867
Does the A-4 have a stable or unstable phugoid? After the Naval Flight
Officer has made a unit step elevator input, calculate the time to half
amplitude or time to double amplitude as appropriate.
7.22 	The following is the longitudinal characteristic equation for an F-89
Scorpion flying at 20,000 ft at Mach 0.638. Determine the short period
and phugoid natural frequencies:
ðs2 þ 4:2102s þ 18:2329Þðs2 þ 0:00899s þ 0:003969Þ ¼ 0
384 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 400 of 650 --

7.23 	An aircraft has the following short period approximation:
a
de
¼ 0:746s  208:6
675s2 þ 1361:6s þ 5452:45
Find the natural frequency, damping ratio, and the steady-state value of
AOA in response to a unit step input using the final value theorem.
7.24 	An F-4 flying at 35,000 and 876 ft=s, has the following lateral-direc-
tional characteristic equation:
ðs þ 0:01311Þðs þ 1:339Þðs2 þ 0:23137s þ 5:7478Þ ¼ 0
(1) Determine the aircraft category, class, and level if you know that all
systems are operating properly and the aircraft is in the pre-contact
refueling position.
(2) Determine the roll mode time constant.
(3) Determine the dutch roll damping ratio, the damped frequency, and the
natural frequency.
(4) Compute the spiral mode T1=2 or T2 , as appropriate.
(5) Estimate the f=b ratio.
ðC lb ¼ 0:08; Cnb ¼ 0:125; I zz ¼ 139;800; I xx ¼ 25;000Þ
7.25 	Given the complex plane root locations for a typical business jet, match
each location to the appropriate dynamic modes of motion:
(1) Roll mode
(2) Dutch roll
(3) Phugoid
(4) Spiral
(5) Short period
AIRCRAFT DYNAMIC STABILITY 	385

-- 401 of 650 --

7.26 	An F-16 flying at 40,000 ft and Mach 0.8 has the following longitudinal
dynamic stability characteristics with all systems up and operating
normally:
short period damping: 0:56
short period natural frequency: 2:9 rad=s
n
a : 10:8
What is the appropriate class, category, and level and are the longitudi-
nal short period MIL-F-8785C requirements met?
7.27 	The C-5A cruising at M ¼ 0:7 and 35,000 ft with a c.g. at 41% has the
following flight characteristics:
phugoid natural frequency: 0:075 rad=s
phugoid time to half amplitude: 369:6 s:
Determine the C-5A damping ratio for that flight condition and deter-
mine if it satisfies MIL-F-8785C.
7.28 	Find yðtÞ for €yy þ 3_yy þ y ¼ 1, subject to yð0Þ ¼ 0, _yyð0Þ ¼ 1. Check your
answer to make sure initial conditions are met.
7.29 	Solve
_xx ¼ 3x  4y
_yy ¼ 2y  8y
subject to xð0Þ ¼ 5; yð0Þ ¼ 3.
7.30 	Given
U1 ¼ 700 ft=s; 	Za ¼ 400 ft=s 2; 	M q ¼ 0:9=s;
Ma ¼ 8=s 2; 	M_aa ¼ 0:4=s
Zde ¼ 0:75 ft=s 2; 	Mde ¼ 0:3=s3
Use the short period approximation to find aðsÞ=deðsÞ.
7.31 	Starting with Eq. (7.44), show which row and column of the Laplace
matrix are eliminated to develop the dutch roll approximation. Which
motion parameter is assumed to remain relatively constant in this
approximation?
386 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 402 of 650 --

7.32 	Find the dutch roll approximation for oND and zD given
U1 ¼ 200 ft=s 	Nr ¼ 0:1=s 	Y r ¼ 0:8 ft=s
Y B ¼ 56 ft=s 2 	NB ¼ 2:6=s 2
7.33 	A system has the following transfer function:
y0
yi
ðsÞ
ðsÞ ¼ 1
ðs þ 10Þðs2 þ 2s þ 16Þ
Find the general form of the time response y0ðtÞ if yiðsÞ is a unit
impulse.
Find the general form of the time response y0ðtÞ if yiðsÞ is a unit step.
What are the two time constants associated with the transient response
terms?
7.34 	If an aircraft has minor but annoying deficiencies and desired task
performance required moderate pilot compensation, the Cooper–Harper
rating should be _________ and the flying qualities level would be
_________.
7.35 	If a hydraulic system failure was estimated to occur every 500 flights on
a new fighter aircraft, what flying qualities level should the aircraft be
expected to fly at for this failure?
AIRCRAFT DYNAMIC STABILITY 	387

-- 403 of 650 --

This page intentionally left blank

-- 404 of 650 --

8
Classical Feedback Control
As we discussed in Chapter 7, an aircraft must have dynamic stability char-
acteristics that generally meet specified criteria if the pilot is to consider the
handling qualities of the aircraft acceptable. In many aircraft designs, a tradeoff
exists between acceptable performance and acceptable dynamic stability charac-
teristics. For example, to meet a performance requirement, aircraft drag may be
minimized by decreasing the size of the horizontal tail. This, of course, will
decrease the short period damping ratio and may result in handling qualities
that do not meet Level 1 requirements. Most modern aircraft incorporate feed-
back control systems that augment the dynamic stability characteristics of an
aircraft so that excellent performance and handling qualities are achievable. An
aircraft feedback control system senses key aircraft motion parameters and,
through control laws (computer calculations) and control surface actuators,
deflects the appropriate control surface to oppose undesired motion (for exam-
ple, add damping) and=or amplify the pilot’s control command. Because of
these feedback control systems, most modern aircraft have excellent handling
qualities and are rated by test pilots very high on the Cooper–Harper scale.
This chapter introduces the fundamentals of feedback control system design
needed to tailor the dynamic stability characteristics of an aircraft.
8.1 	Open-Loop Systems, Transfer Functions, and Block Diagrams
We are familiar with aircraft transfer functions and how they are used to
represent the output=input for the aircraft. Transfer functions are used for a
variety of applications and include dynamic behavior because they are based
on the differential equations that define the system. Most systems can be
thought of as involving a process where an input is converted to an output, as
shown in Fig. 8.1.
The system represented in Fig. 8.1 is referred to as an open-loop system
because the output does not affect the input. A common toaster is an example
of an open-loop system. The first time a piece of bread is put in, the output
may range anywhere from the same piece of bread, to nicely toasted bread, to
completely burned. Of course, after we observe the output of the first round,
we adjust the setting on the toaster to compensate. As soon as we take this
step, the system is no longer open-loop because we have adjusted the input
389
Fig. 8.1 	Simple open-loop system.

-- 405 of 650 --

(toaster setting) based on the output. Another example of an open-loop system
is the first shot with a rifle when target practicing. The output (where the bullet
hits) does not affect the input (how we aim the rifle) on the first shot. After we
see where the first shot hits, we typically compensate on the second shot and,
at that point, we no longer have an open-loop system. For an aircraft, the trans-
fer functions we developed in Chapter 7 can be used to represent the process.
For example, if the y=de transfer function is the process we are interested in,
Fig. 8.1 becomes Fig. 8.2.
In most open-loop systems, a controller is needed to control or activate the
process. This is illustrated in Fig. 8.3.
An example of a controller for an aircraft system is a hydraulic actuator
used to move an aircraft control surface. A control valve on the actuator is
positioned by either a mechanical or electrical input, the control valve ports
hydraulic fluid under pressure to the actuator, and the actuator piston moves
until the control valve shuts off the hydraulic fluid. A hydraulic actuator is
shown in Fig. 8.4.
Clearly, the actuator piston cannot move instantaneously because it takes a
finite time for the hydraulic fluid to flow through the ports from the control
valve. In response to a step input, the resulting motion (x) of a hydraulic actua-
tor can be modeled as an exponential rise:
xðtÞ ¼ Zð1  eat Þ 	ð8:1Þ
Fig. 8.2 	Aircraft open-loop system.
Fig. 8.4 	Simplified hydraulic actuator.
Fig. 8.3 	Open-loop system with a controller.
390 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 406 of 650 --

where Z is the final displacement value of the actuator. Using the techniques
developed in Sec. 7.3.1, the generalized transfer function for a hydraulic
actuator is then
X ðsÞ
EðsÞ ¼ a
s þ a ð8:2Þ
where EðsÞ is the Laplace transform of the input and X ðsÞ is the Laplace trans-
form of the output. For the case of Eq. (8.1), EðsÞ ¼ Z=s. The time constant
for the hydraulic actuator represented by Eq. (8.2) is
thydraulic
acutator
¼ 1
a s 	ð8:3Þ
and the final value of xðtÞ for a unit step input is
xð1Þ ¼ lim
s ! 0
1
s
 
s a
s þ a
 	
) 1
using the final value theorem. If the output of the hydraulic actuator xðtÞ is
mechanically connected to a control surface to cause a control surface displace-
ment such as de, we then have the open-loop situation shown in Fig. 8.5.
The block diagram representations of the two open-loop systems represented
by Figs. 8.2 and 8.5 are normally combined in series for an aircraft, as shown
in Fig. 8.6.
Fig. 8.6 	Block diagram representation of open-loop aircraft system.
Fig. 8.5 	Simplified representation of an aircraft hydraulic actuator in transfer
function form.
CLASSICAL FEEDBACK CONTROL 	391

-- 407 of 650 --

Example 8.1
Find the open-loop y=E transfer function for the Lear Jet using the data
provided in Example 7.10 and assuming a hydraulic actuator with a 0.1 s time
constant.
From Example 7.10, we have
y
de
¼ ð208:1Þs2 þ ð136:9Þs þ 2:380
ð675:9Þs4 þ ð1371Þs3 þ ð5459Þs2 þ ð86:31Þs þ 44:78
With a 0.1 s actuator time constant, the a in Eq. (8.3) becomes 10, and we
have
de
E ¼ 10
s þ 10
and the y=E transfer function becomes
y
E ¼ 10½208:1Þs2 þ ð136:9Þs þ 2:380
ðs þ 10Þ½ð675:9Þs4 þ ð1371Þs3 þ ð5459Þs2 þ ð86:31Þs þ 44:78
Notice that we simply multiplied two transfer functions, represented by block
diagrams in series, to obtain a single transfer function for this open-loop
system. We also have started to drop the (s) associated with Laplace variables.
For example,
y
E ¼ yðsÞ
EðsÞ
For this system, we can think of E as being the input (for example, the pilot’s
stick displacement) and y as being the output (how the aircraft reacts in terms
of an aircraft motion variable). We will begin referring to E as the error signal
when we discuss closed-loop systems.
8.2 	Closed-Loop Systems
Closed-loop systems are systems where the output is measured and fed
back to modify the input that would normally be seen by the open-loop
system. A closed-loop system is presented in general form in Fig. 8.7.
The feedback loop makes a measurement of the output (usually using a
sensor), multiplies this measurement by an adjustable gain and then provides
this feedback signal to a comparator that subtracts it from the input. The
comparator is indicated by the circle enclosing X and the subtraction is indi-
cated by negative sign to the lower left of the comparator.
We are surrounded by examples of closed-loop systems in everyday life. A
thermostat to control the temperature in a house is a common example. The
thermostat is adjusted to the desired temperature (input), a controller activates
the furnace if the desired house temperature is below the desired temperature,
392 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 408 of 650 --

the furnace provides the heating process to increase the temperature of the
house (output), and a sensor in the thermostat measures the temperature of the
house and feeds this back to the comparator where it is subtracted from the
input signal. When the desired temperature and house temperature match, the
error signal coming from the comparator is zero and the controller shuts down
the furnace. Another example is cruise control on an automobile. The input is
the desired speed and the output is the actual speed. The actual speed is
measured and fed back so that the throttle can be adjusted automatically to
maintain the desired speed.
Closed-loop feedback control systems are used extensively on aircraft to
modify dynamic stability characteristics and implement pilot relief (autopilot)
functions. As an example of a pilot relief mode, a simplified pitch attitude
hold autopilot is presented in Fig. 8.8.
yc is the desired pitch attitude commanded by the pilot. The actuator and
aircraft transfer functions were discussed in the previous section. The output is
the actual pitch attitude of the aircraft (y), while the vertical gyro (a sensor)
measures the pitch attitude and feeds it back to the comparator. An error signal
(E) is then generated and input to the actuator. The end result is that the
aircraft automatically holds the commanded pitch attitude without the need for
continuous pilot inputs.
Figure 8.9 shows the portion of a feedback control system usually accom-
plished within a flight control computer.
Fig. 8.8 	Simplified aircraft closed-loop pitch attitude hold system.
Fig. 8.7 	Generalized closed-loop system.
CLASSICAL FEEDBACK CONTROL 	393

-- 409 of 650 --

The command signal and vertical gyro signal are input to the computer in
the form of voltages or digital signals. Computer software multiplies the verti-
cal gyro signal by the value of the adjustable gain (which is a fixed value for a
final configuration), and then performs the comparator subtraction. Finally, the
computer outputs the error signal (E) to an electromechanical actuator in the
form of a voltage. The electromechanical actuator converts the voltage to a
mechanical displacement, which is input into the control valve of the aircraft
hydraulic actuator. Many aircraft integrate the electromechanical actuator with
the hydraulic actuator as one unit. Thus, Fig. 8.9 presents only one transfer
function for the integrated actuator.
8.3 	Closed-Loop Analysis of a Second-Order System
We have seen how closed-loop systems can be used for automatic control
functions such as a pitch attitude hold autopilot. They are also extremely
useful for modifying the dynamic stability characteristics of the aircraft. In
Sec. 7.1, we saw that the generalized transfer function for a second-order
system was
X ðsÞ
Y ðsÞ ¼ o2
n
s2 þ 2zon s þ o2
n
ð8:4Þ
Think of this transfer function as representative of the short period mode of an
aircraft with the natural frequency and damping ratio representing the dynamic
characteristics of the basic airframe. The time domain differential equation for
zero initial conditions is
€xx þ 2zon _xx þ o2
n x ¼ o2
n yðtÞ 	ð8:5Þ
Fig. 8.9 	Closed-loop system illustrating functions performed within a flight control
computer.
394 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 410 of 650 --

We will analyze how these dynamic characteristics might be modified using
three types of closed-loop systems.
Figure 8.10 presents a simple closed-loop position feedback system. The
term ‘‘position’’ refers to the fact that the output variable (x) is fed back as
itself (not as a derivative of x).
Notice that the controller and measurement transfer functions have been
omitted for simplicity. The closed-loop differential equation can be seen to be
€xx þ 2zon _xx þ o2
n x ¼ o2
nðyðtÞ  K1xÞ
and the closed-loop transfer function is
X ðsÞ
Y ðsÞ ¼ o2
n
s2 þ 2zon s þ o2
nð1 þ K1Þ
The closed-loop characteristic equation for this system is
s2 þ 2zon s þ o2
nð1 þ K1Þ ¼ 0
and we can see that
on position
feedback
¼ on
ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1 þ K1
p ð8:6Þ
Likewise, the closed-loop damping ratio has become
zposition
feedback
¼ z
ffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1 þ K1
p 	ð8:7Þ
The important point is that a closed-loop position feedback system provides
the opportunity to change both the basic airframe natural frequency and damp-
ing ratio by adjusting the variable gain K1 . As seen from Eq. (8.6), position
feedback allows the designer to increase the natural frequency of the closed-
loop system as K1 is increased positively from zero. Note that when K1 is
equal to zero we have the original open-loop system. It is unfortunate for
most applications that the closed-loop damping ratio [Eq. (8.7)] decreases as
K1 is increased. The keen observer will also notice that the closed-loop time
Fig. 8.10 	Position feedback system.
CLASSICAL FEEDBACK CONTROL 	395

-- 411 of 650 --

constant 	ð1=zposition
feedback
on position
feedback
Þ 	remains 	unchanged 	from 	the 	open-loop 	time
constant ð1=yonÞ. Thus, a position feedback system provides the advantage of
automatic control of a motion variable (as in the pitch attitude hold example),
but will be accompanied by an increase in natural frequency, a decrease in
damping ratio, and no change in time constant.
Figure 8.11 presents a simple closed-loop rate feedback system. Rate refers
to the fact that the derivative of the output variable (x) is fed back. Notice that
_xxðsÞ is generated in the block diagram by simply multiplying xðsÞ by the
Laplace operator s. As discussed in Sec. 7.3.1, the derivative in the Laplace
domain of a variable such as xðsÞ is sxðsÞ with zero initial conditions. The
closed-loop differential equation for the rate feedback system becomes
€xx þ 2zon _xx þ o2
n x ¼ o2
nðyðtÞ  K2 _xxÞ
and the closed-loop transfer function is
xðsÞ
yðsÞ ¼ o2
n
s2 þ ð2zon þ K2o2
nÞs þ o2
n
The closed-loop characteristic equation for the system is
s2 þ ð2zon þ K2o2
nÞs þ o2
n ¼ 0
and we can see that the natural frequency of the open-loop and closed-loop
system remains constant and is not affected by the value of K2 . The closed-
loop damping ratio becomes
z rate
feedback ¼ 2z þ K2on
2 ð8:8Þ
Rate feedback allows the designer to increase damping ratio as K2 is increased
positively from zero. This provides a powerful design tool to tailor the hand-
ling qualities of an aircraft and meet dynamic stability damping ratio require-
ments.
Fig. 8.11 	Rate feedback system.
396 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 412 of 650 --

A rate feedback system typically involves adding a rate gyro to the aircraft
to provide the _xx measurement and feedback signal shown in Fig. 8.11. Figure
8.12 illustrates where the rate gyro fits into the system.
A rate gyro is a sensor that outputs a voltage proportional to an angular
rate. Most highly augmented aircraft have pitch rate (Q), roll rate (P), and yaw
rate (R) gyros to tailor dynamic stability and response characteristics for all
three rotational degrees of freedom.
Figure 8.13 presents a simple closed-loop acceleration feedback system.
Acceleration refers to the fact that the second derivative of the output variable
(x) is fed back. Notice that €xxðsÞ is generated in the block diagram by simply
multiplying xðsÞ by the Laplace operator s2
. As discussed in Sec. 7.3.1, the
second derivative in the Laplace domain of a variable such as xðsÞ is s2 xðsÞ
with zero initial conditions. The closed-loop differential equation for the accel-
eration feedback system becomes
€xx þ 2zon _xx þ o2
n x ¼ o2
nðyðtÞ  K3 €xxÞ
and the closed-loop transfer function is
xðsÞ
yðsÞ ¼ o2
n
ð1 þ K3o2
nÞs2 þ 2zon s þ o2
n
Fig. 8.12 	Rate feedback system with component breakouts.
Fig. 8.13 	Acceleration feedback system.
CLASSICAL FEEDBACK CONTROL 	397

-- 413 of 650 --

The closed-loop characteristic equation for the system is
s2 þ 2zon
ð1 þ K3o2
nÞ s þ o2
n
ð1 þ K3o2
nÞ ¼ 0
The closed-loop natural frequency becomes
onaccleration
feedback
¼ on	
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1 þ K3o2
n
p 	ð8:9Þ
and the closed-loop damping ratio is
zacceleration
feedback
¼ z
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1 þ K3o2
n
p 	ð8:10Þ
Equations (8.9) and (8.10) indicate that acceleration feedback decreases both
the natural frequency, and damping ratio of the system as K3 is increased posi-
tively from zero. Acceleration feedback involves the addition of an acceler-
ometer in the aircraft to provide the €xx measurement.
With the position, rate, and acceleration feedback, we have the ability to
increase or decrease the natural frequency and damping ratio of an open-loop
system. The dynamic stability characteristics and handling qualities of an
aircraft can be tailored with these tools, and the roots of the closed-loop char-
acteristic equation can be positioned in the complex-plane to meet stated
requirements. In some cases, a combination of position, rate, and=or accelera-
tion feedback is needed to achieve the desired characteristics. A multiloop
system using all three types of feedback is presented in Fig. 8.14.
The next section will develop analysis tools to simplify the process of find-
ing closed-loop transfer functions and dynamic stability characteristics.
Fig. 8.14 	A multiloop system using three feedback loops.
398 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 414 of 650 --

8.4 	Closed-Loop Transfer Functions
The closed-loop transfer function (CLTF) of any feedback control system
can be determined by using a relatively straightforward process. Consider the
simple closed-loop system of Fig. 8.15.
We define RðsÞ as the input, CðsÞ as the output or control variable, GðsÞ as
the forward path transfer function, HðsÞ as the feedback path transfer function,
CðsÞ=RðsÞ as the CLTF, EðsÞ as the error signal, and BðsÞ as the feedback
signal. GðsÞ includes all transfer functions and gains in the forward path of the
closed-loop system, and HðsÞ includes all transfer functions and gains in the
feedback path. We will now drop the ðsÞ with each of these terms for simpli-
city, realizing that all transfer functions and signals in a block diagram are
expressed in the Laplace domain. To develop an expression for the CLTF,
block diagram algebra is used beginning with an expression for the output.
C ¼ GE
Of course, the error signal is
E ¼ R  B
Substituting this into the equation for the output, we have
C ¼ GðR  BÞ
The feedback signal is
B ¼ HC
Substituting this into the previous equation, we have
C ¼ GðR  HCÞ ¼ GR  GHC
Rearranging,
Cð1 þ GHÞ ¼ GR
Fig. 8.15 	Simple closed-loop system.
CLASSICAL FEEDBACK CONTROL 	399

-- 415 of 650 --

and the CLTF becomes:
C
R ¼ G
1 þ GH ¼ CLTF 	ð8:11Þ
This powerful relationship forms the basis for simplifying closed-loop systems
to one transfer function. This process can be thought of as representing a
closed-loop system as one transfer function in open-loop form. For example,
through the use of Eq. (8.11), the block diagram of Fig. 8.15 is equivalent to
the open-loop block diagram of Fig. 8.16.
The closed-loop characteristic equation is easily obtained from Eq. (8.11) as
1 þ GH ¼ 0 	ð8:12Þ
Of course, the closed-loop characteristic equation leads directly to determina-
tion of closed-loop dynamic stability characteristics such as natural frequency
and damping ratio.
Example 8.2
Find the CLTF for the following system.
We first notice that the forward path transfer function has a natural frequency
of 4 rad=s and a damping ratio of 0.5. By adding the feedback path with a
gain of K ¼ 2, the CLTF becomes
CLTF ¼ G
1 þ GH ¼
16
s2 þ 4s þ 16
1 þ 16ð2Þ
s2 þ 4s þ 16
Fig. 8.16 	Open-loop representation of closed-loop system.
400 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 416 of 650 --

Simplifying,
CLTF ¼ 16
s2 þ 4s þ 48
Notice that the closed-loop system has a natural frequency of ffiffiffiffiffi
48
p or
6.93 rad=s and a damping ratio of 0.289. This is a classic case of position feed-
back (appropriate to autopilot functions) where the natural frequency is
increased and the damping ratio is decreased as addressed in Sec. 8.3.
Example 8.3
Find the CLTF for the following system.
The feedback-path transfer function (H) becomes s times 0.3 or 0.3s. Notice
that this is a case of rate feedback. The only difference from that discussed in
Sec. 8.3 is that the derivative is taken in the feedback loop. We expect that the
damping ratio will be increased and that the natural frequency will stay
constant.
CLTF ¼ G
1 þ GH ¼
16
s2 þ 4s þ 16
1 þ 16ð0:3sÞ
s2 þ 4s þ 16
Simplifying,
CLTF ¼ 16
s2 þ 8:8s þ 16
Indeed, the natural frequency stays constant at 4 rad=s but the damping ratio
has increased to 1.1, making the closed-loop system behave as a first-order
response.
CLASSICAL FEEDBACK CONTROL 	401

-- 417 of 650 --

Example 8.4
Find the CLTF for the following system.
In comparing this system to that of Example 8.3, notice that we have added an
actuator in the forward path (t ¼ 1=15 s) and changed the gain in the feedback
path to 0.1. The forward-path transfer function becomes
G ¼ 15
s þ 15
 	 16
s2 þ 4s þ 16
 	
¼ 240
s3 þ 19s2 þ 76s þ 240
and the CLTF is
CLTF ¼ G
1 þ GH ¼
240
s3 þ 19s2 þ 76s þ 240
1 þ 240ð0:1sÞ
s3 þ 19s2 þ 76s þ 240
Simplifying,
CLTF ¼ 240
s3 þ 19s2 þ 100s þ 240 ¼ 240
ðs þ 12:56Þðs2 þ 6:44s þ 19:13Þ
This example illustrates how to find the CLTF with more than one transfer
function in the forward path. It is also interesting to note that closing the loop
with rate feedback has appeared to move the actuator root from 15 to
12:56 (indicating a slower response or larger time constant). In addition, the
natural frequency of the second-order polynominal has increased from 4 rad=s
to ffiffiffiffiffi
19
p rad=s (4.36 rad=s) for the closed-loop case, and the damping ratio has
increased from 0.5 to 0.739. The increase in damping ratio was expected, but
the effects on the actuator root and the natural frequency may be somewhat
surprising based on our discussion of rate feedback in Sec. 8.3. However,
remember that our discussion there was strictly for a forward-path transfer
function with a second-order denominator (and characteristic equation). The
effects of closing the loop with higher order forward loop transfer functions
are slightly more complex, and additional analysis tools will be developed to
assist in understanding these effects.
402 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 418 of 650 --

8.5 	Time Response Characteristics
As we have seen, closed-loop systems allow modification of the dynamic
stability characteristics of the forward-path transfer function. Dynamic stability
characteristics have been defined by familiar parameters such as natural
frequency, damping ratio, damped frequency, and time constant. These para-
meters can be easily identified on a complex plane (s plane) plot of the roots
of the characteristic equation, and they provide some insight into the time
response characteristics expected of the system. Experience has shown that
additional parameters that specifically define time response characteristics are
very useful, especially when discussing the flying qualities of an aircraft with
test pilots during flight test development of the feedback control system. The
additional parameters discussed in this section are based on the step input time
response of a system (aircraft), as presented in Fig. 8.17.
The second-order response shown in Fig. 8.17 is representative of the clas-
sic second-order transfer function
TF ¼ o2
n
s2 þ 2zon s þ o2
n
However, the time response characteristics discussed in this section are ap-
plicable to nearly all systems. Of course, first-order systems will not have an
overshoot; therefore, a few of the parameters lose meaning.
Fig. 8.17 	Time response characteristics.
CLASSICAL FEEDBACK CONTROL 	403

-- 419 of 650 --

The rise time (t r) is the time required for a step-input response to rise from
10% to 90% of its steady state (final) value. The delay time (t d ) is the time it
takes for the response to reach 50% of the steady-state value. Rise time and
delay time indicate how fast the system responds to a step input. For the clas-
sic second-order system, these parameters can be estimated in terms of the
natural frequency and damping ratio.
t r  1 þ 1:1z þ 1:4z2
on
ð8:13Þ
and
t d  1 þ 0:6z þ 0:15z2
on
ð8:14Þ
The settling time (t s) is the time required for the response to stay within a
specified percentage (usually 2% or 5%) of the steady-state value. Figure 8.17
illustrates a 5% settling time. Again, for the classic second-order system, esti-
mates are available.
t s2 %  4
zon
ð8:15Þ
t s5 %  3
zon
ð8:16Þ
It is interesting to note that the settling time estimates are directly based on the
properties of the time constant. For an impulse input (rather than a step),
t ¼ 4t is required to obtain 98% of the steady-state value (t s2 %). Likewise,
95% of the steady-state value will be obtained at t ¼ 3t, which is the estimate
for t s5%. Thus, the estimates presented in Eqs. (8.15) and (8.16) will be slightly
low for a step input response.
The maximum overshoot is the difference between the magnitude of the
maximum overshoot and the steady-state value. The magnitude of the peak
(M p) is the value of the response at maximum overshoot. For a second-order
system,
M p  1 þ e
zp	
ffiffiffiffiffiffi
1z2	
p
ð8:17Þ
Another useful parameter related to the maximum overshoot is the percentage
of max overshoot which defines the magnitude of the max overshoot in terms
of a percentage of the steady-state value of the response ðMsteady
state
Þ.
% max
overshoot ¼ Mp  Msteady
state
Msteady
state
 100 	ð8:18Þ
404 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 420 of 650 --

The time to max overshoot (tmax ) is the time required for the response to rise
to the maximum overshoot (which is the first overshoot in the case of the clas-
sic second-order system). The time to max overshoot can be estimated by
tmax  p
on
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
p 	¼ p
oD
ð8:19Þ
This estimate can be seen to be one-half the period of oscillation (T) for a
second-order system.
Again, the estimates defined for time response characteristics in Eqs. (8.13–
8.19) are based on the classic second-order transfer function. They are also
useful for more complex systems in providing insight into the effect of key
parameters. For the majority of cases, time response characteristics will be
measured directly from the time response in a manner similar to Fig. 8.17.
8.6 	Root Locus Analysis
We have seen that in going from an open-loop system (the basic aircraft) to
a closed-loop feedback control system, the roots of the characteristic equation
can be significantly changed. Of course, these roots directly affect the dynamic
stability characteristics of the aircraft. Sect. 7.2 provided an understanding of
how the root locations on the complex plane translate to the dynamic stability
parameters of natural frequency, damping ratio, damped frequency, and time
constant. A correlation was also made between complex plane root location
and time response. We will now develop a powerful design tool called the root
locus, which graphically presents how the roots of the closed-loop characteris-
tic equation change on the complex plane as the adjustable gain (K) is varied
from zero to infinity.
We will begin by considering two locations for the adjustable gain (K).
Figure 8.18 presents the two possibilities. Case 1 has the adjustable gain in the
feedback path and is the case we have used for our previous development.
Case 2 has the adjustable gain in the forward path. Referring back to Fig. 8.9,
this case is also easily implemented in the flight control computer. Thus, the
designer has both options available.
Fig. 8.18 	Possible locations for the adjustable gain.
CLASSICAL FEEDBACK CONTROL 	405

-- 421 of 650 --

The root locus focuses on the roots of the closed-loop characteristic equa-
tion as a function of K. From Eqs. (8.11) and (8.12), the general form of the
closed-loop characteristic equation is
1 þ GH ¼ 0
Because K is part of H in case 1 and part of G in case 2, we will break it out
in our representation of the characteristic equation. Referring to Fig. 8.18, for
case 1 we have
H ¼ KH*
and
1 þ KGH* ¼ 0
or
KGH* ¼ 1 ¼ GH 	ð8:20Þ
Programs that automatically generate a root locus plot will normally use GH*
as the input transfer function for case 1 systems.
For case 2, we have
G ¼ KG*
1 þ KG*H ¼ 0
or
KG*H ¼ 1 ¼ GH 	ð8:21Þ
Programs that automatically generate a root locus plot will normally use G*H
as the input transfer function for case 2 systems.
Notice that Eqs. (8.20) and (8.21) simply have K times the remaining trans-
fer functions in the forward path and feedback path set equal to 1. GH is
key to determination of the roots of the characteristic equation. We refer to it
as the open-loop transfer function (not to be confused with the forward path
transfer function, G). The open-loop transfer function (OLTF) can be expressed
as
GH ¼ OLTF ¼
K Q	i¼m
i¼1
ðs þ ZiÞ
Q	j¼n
j¼1
ðs þ P jÞ
ð8:22Þ
Values of s that make the numerator of Eq. (8.22) go to zero are referred to as
open-loop zeros, or roots of the OLTF numerator. The zeros in Eq. (8.22) can
406 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 422 of 650 --

be seen to be equal to Z1 , Z2; . . .  Z m. Values of s that make the denomi-
nator of Eq. (8.22) go to zero are referred to as open-loop poles, or roots of
the open-loop characteristic equation. The poles in Eq. (8.22) can be seen to
be P1 , P2; . . .  Pn. It is believed that the word ‘‘pole’’ was chosen based
on the fact that a pole causes the denominator of a transfer function to go to
zero, which causes the transfer function to go to infinity. With a stretch of the
imagination, this could be viewed as the effect a tent pole has on the roof of a
tent (that is, pointing toward infinity). A few examples will help clarify these
definitions.
Example 8.5
Find the OLTF poles and zeros for the following system.
This is a Case 1 closed-loop system. The OLTF is
OLTF ¼ GH ¼ Kð20Þð48Þðs þ 1Þ
ðs þ 20Þðs þ 2Þðs þ 4Þðs þ 6Þðs þ 10Þ
There is one open-loop zero at s ¼ 1. There are five open-loop poles at
s ¼ 2, 4, 6, 10, and 20.
Example 8.6
Find the open-loop poles and zeros for the following system.
For this Case 2 system, the OLTF is
GH ¼ OLTF ¼ Kð15Þð16Þs
ðs þ 15Þðs þ 10Þðs2 þ 4s þ 16Þ
There is one open-loop zero at s ¼ 0. There are four open-loop poles at
s ¼ 15, 10, and 2  3:46j. Notice that two of the poles are complex
conjugates.
CLASSICAL FEEDBACK CONTROL 	407

-- 423 of 650 --

8.6.1 	Root Locus Fundamentals
The root locus plots the roots of the closed-loop characteristic equation as
K is varied from zero to infinity. Returning to Eq. (8.12) and incorporating Eq.
(8.22), we can express the closed-loop characteristic equation as
1 þ
K Q	i¼m
i¼1
ðs þ ZiÞ
Q	j¼n
j¼1
ðs þ PjÞ
¼ 0
Rearranging, the closed-loop characteristic equation becomes
Q	j¼n
j¼1
ðs þ P jÞ þ K Q	i¼m
i¼1
ðs þ ZiÞ ¼ 0 	ð8:23Þ
For a value of K ¼ 0, we can see that the roots of the closed-loop characteris-
tic equation are located at the open-loop poles (s ¼ P1 , P2; . . .  Pn). For a
value of K ¼ 1 (infinity), the roots of the closed-loop characteristic equation
approach the open-loop zeros (s ¼ Z1 , Z2; . . .  Z m). Based on this, we can
make an important observation. The root locus will begin at the open-loop
poles for a value of K ¼ 0, and end at open-loop zeros for a value of
K ¼ 1	1. We will see that asymptotes may also be involved for the K ¼ 1
case. Consider the closed-loop system of Fig. 8.19.
The OLTF is
OLTF ¼ GH ¼ Kðs þ 2Þðs þ 4Þðs þ 6Þ
ðs þ 10Þðs2 þ 4s þ 16Þ
The open-loop zeros are at s ¼ 2, 4, and 6, and the open-loop poles are
at s ¼ 10, and 2  3:46j. Figure 8.20 presents a plot of the open-loop
poles and zeros on the complex plane.
Fig. 8.19 	Closed-loop system example.
408 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 424 of 650 --

Notice that the open-loop poles are each plotted with an ‘‘x’’, and that the
open-loop zeros are each plotted with a ‘‘o’’. Using Eq. (8.23), the closed-loop
characteristic equation is
ðs þ 10Þðs2 þ 4s þ 16Þ þ Kðs þ 2Þðs þ 4Þðs þ 6Þ ¼ 0
We will next find the roots of this characteristic equation for K ¼ 2. Using a
root-finder, we have
s ¼ 8; 2:33  2:29j at K ¼ 2
In a similar manner, we will find the roots at K ¼ 10 and 40.
s ¼ 6:82; 2:68  1:16j at K ¼ 10
s ¼ 6:29; 3:36; 2:40 at K ¼ 40
Figure 8.21 adds these roots to the plot of Fig. 8.20.
A close review of Fig. 8.21 shows that one of the closed-loop roots defines
a branch of the root locus that starts (for K ¼ 0) at the open-loop pole,
s ¼ 10, and migrates along the real axis as K is increased. It reaches the
open-loop zero at s ¼ 6 when K ¼ 1. Another branch of the root locus
starts at the open-loop pole s ¼ 2 þ 3:46j and moves toward the real axis. It
meets the final branch of the root locus at a break-in point on the real axis (for
K  30) and then one closed-loop root moves toward the open-loop zero at
s ¼ 2 and the other root moves toward the open-loop zero at s ¼ 4. The
uncluttered plot of the root locus for this system is presented in Fig. 8.22.
A more typical aircraft case has more poles than zeros in the open-loop
transfer function. For example, consider Fig. 8.23, which is a rate feedback
system similar to that presented in Fig. 8.11.
Fig. 8.20 	Plot of open-loop poles and zeros for system of Fig. 8.19.
CLASSICAL FEEDBACK CONTROL 	409

-- 425 of 650 --

The OLTF is
OLTF ¼ 160Ks
ðs þ 10Þðs2 þ 4s þ 16Þ
which has an open-loop zero at s ¼ 0 and open-loop poles at s ¼ 10, and
2  3:46j. A plot of the root locus is presented in Fig. 8.24.
Notice that we have one open-loop zero and three open-loop poles. The
open-loop pole at s ¼ 10 migrates to the open-loop zero at s ¼ 0 as K is
increased from 0 to infinity. As can be seen in Fig. 8.24, the two complex
Fig. 8.21 	Plot of closed-loop roots at selected gain values for system of Fig. 8.19.
Fig. 8.22 	Root locus of the system of Fig. 8.19.
410 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 426 of 650 --

conjugate poles migrate, as K is increased to infinity, toward asymptotes that
go to positive and negative infinity along the imaginary axis. This example
illustrates another principle of the root locus: The number of branches of the
root locus that go to infinity along an asymptote is equal to the number of
OLTF poles minus the number of OLTF zeros. Simply stated, each OLTF
zero will draw one branch of the root locus toward it, and that branch will
terminate at the zero for K ¼ infinity. The remaining branches (originating
from an OLTF pole with no zero available for termination) will go to infinity
along an asymptote as K goes to infinity.
8.6.2 	Magnitude and Angle Criteria
As we have seen, each branch of the root locus defines how a root of the
closed-loop characteristic equation migrates as K is increased from zero to infi-
nity. The closed-loop roots of the characteristic equation are also called closed-
loop poles and are expressed as complex numbers(s) using the s ¼ a þ bj
format. Recalling Eq. (8.12) for the closed-loop characteristic equation, we had
1 þ GH ¼ 0
Fig. 8.23 	Closed-loop system example for rate feedback.
Fig. 8.24 	Root locus plot for the system of Fig. 8.23.
CLASSICAL FEEDBACK CONTROL 	411

-- 427 of 650 --

or
GH ¼ 1 	ð8:24Þ
Each value of s in the complex plane that is part of a branch of the root locus
must therefore satisfy the criteria defined by Eq. (8.24). Because a complex
number can also be expressed as a vector with a magnitude and an angle, we
can think of the complex number s ¼ a þ bj as
s ¼ j ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
a2 þ b2
p jff tan1 b
a
 
Using the magnitude and angle representation, the root locus criteria of
Eq. (8.24) becomes
jGHj ¼ 1
ffGH ¼ 180 deg; 540 deg; etc: ð8:25Þ
Therefore, each point on the root locus must satisfy the requirements of Eq.
(8.25) (as a reminder, we are restricting ourselves to the K > 0 case). Another
way of looking at this is that each root of the closed-loop characteristic equa-
tion must satisfy the criteria of Eq. (8.25). Using the general form for the
OLTF presented in Eq. (8.22), we have
K Q	i¼m
i¼1
jðs þ ZiÞj
Q	j¼n
j¼1
jðs þ P jÞj
¼ 1 	ð8:26Þ
and
ffK þ ffðs þ Z1Þ þ ffðs þ Z2Þ þ    ffðs þ Z mÞ
 ffðs þ P1Þ  ffðs þ P2Þ     ffðs þ PnÞ ¼ 180 deg; 540 deg; etc:
when applying the criteria of Eq. (8.25). Normally, the angle criteria is tested
first because K can be adjusted to satisfy the magnitude criteria. An example
will be used to illustrate application of this criteria.
412 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 428 of 650 --

Example 8.7
For the following system, determine which of the following values of s are
on the root locus [satisfy the criteria of Eq. (8.25)].
s ¼ 1:5; s ¼ 2:5; s ¼ 3:615 þ 1:015j
We begin by plotting the OLTF poles and zeros on the complex plane.
Next, the angle criteria are checked for each of the points by using vectors that
originate at each of the open-loop poles and zero. For s ¼ 1:5 we have
Notice that vectors are drawn from each OLTF pole and zero to the test point.
We use a counterclockwise rotation from the real axis to define the angle
CLASSICAL FEEDBACK CONTROL 	413

-- 429 of 650 --

associated with each vector. We have
ffðs þ 1Þ ¼ 180 deg
ffðs þ 2Þ ¼ 0 deg
ffðs þ 3Þ ¼ 0 deg
ffðs þ 4Þ ¼ 0 deg
Because the ffK ¼ 0 deg in applying the angle criteria of Eq. (8.26) we add the
angle of the zeros and subtract the angle of each pole. We have
0 deg þ 180 deg  0 deg  0 deg  0 deg ¼ 180 deg
and the angle criteria is satisfied for s ¼ 1:5. It is a point on the root locus.
The value of K at s ¼ 1:5 can be determined from the magnitude criteria.
Using Eq. (8.26),
K ¼
Q	j¼n
j¼1
jðs þ PjÞj
Q	i¼m
i¼1
jðs þ ZiÞj
¼ ð0:5Þð1:5Þð2:5Þ
0:5 ¼ 3:75
Next, we will test s ¼ 2:5 by using the angle criteria.
We have
ffðs þ 1Þ ¼ 180 deg
ffðs þ 2Þ ¼ 180 deg
ffðs þ 3Þ ¼ 0 deg
ffðs þ 4Þ ¼ 0 deg
414 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 430 of 650 --

and checking the angle criteria with Eq. (8.26),
0 deg þ 180 deg  180 deg  0 deg  0 deg ¼ 0 deg
which does not equal 180 deg, 540 deg. Therefore, s ¼ 2:5 is not on the
root locus.
Finally, we will check s ¼ 3:615 þ 1:0115j
We have
ffðs þ 1Þ ¼ 158:79 deg
ffðs þ 2Þ ¼ 147:85 deg
ffðs þ 3Þ ¼ 121:21 deg
ffðs þ 4Þ ¼ 69:23 deg
and checking the angle criteria, we have
0 deg þ 158:79 deg  147:85 deg  121:21 deg  69:23 deg
¼ 179:5 deg  180 deg
This is close enough (based on round off errors) to satisfy the angle criteria.
The point s ¼ 3:615 þ 1:0115j is on the root locus. The value of K at this
point can be determined using the magnitude criteria.
K ¼
Q	j¼n
j¼1
jðs þ PjÞj
Q	i¼m
i¼1
jðs þ ZiÞj
¼ ð1:907Þð1:187Þð1:086Þ
2:805 ¼ 0:876
CLASSICAL FEEDBACK CONTROL 	415

-- 431 of 650 --

A plot of the complete root locus follows:
Fortunately, this agonizing process is not used to plot the root locus. Only an
understanding of the angle and magnitude criteria are needed so that several
plotting rules can be developed. In addition, excellent computer programs are
available to generate root locus plots. However, no matter how a root locus
plot is obtained, a clear understanding of the information it provides and how
it can be used is needed.
8.6.3 	Plotting the Root Locus
Nine ‘‘rule of thumb’’ plotting rules are used to obtain the general shape of
a root locus. The insight provided by these plotting rules will significantly aid
the design process when attempting to design a system to meet specific
requirements.
1) Number of Root Locus Branches: The number of branches of the root locus
is equal to the number of poles of the OLTF (for example, 5 poles will have
5 branches).
2) Root Migration: The root locus begins at the open-loop poles (at K ¼ 0)
and goes to the open-loop zeros or to infinity (at K ¼ 1). The number of
branches going to infinity is equal to the number of open-loop poles minus
the number of open-loop zeros.
3) Real Axis Location: A branch of the root locus is on the real axis if it is to
the left of an odd number of poles and zeros. This is illustrated in Fig. 8.25
for a point s1 on the real axis. Note that s1 is to the left of an odd number
(1) of poles.
416 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 432 of 650 --

A check using the angle criteria shows that the point is on the root
locus.
ffGH ¼ ðy2  y2 ¼ 0 degÞ
|fflfflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflfflffl}
angles of zeros to root at s1
 ð0 deg þ y1  y1  0 deg þ 180 degÞ
|fflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl{zfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflfflffl}
angle of poles to s1
¼ 180 deg
Notice that the complex conjugate pairs cancel each other. Real axis
locations of the root locus for the above example are between the two
poles nearest the origin and between the pole and zero to the far left of
the plot.
4) Symmetry: The root locus is symmetric about the real axis. In other words,
branches of the root locus that extend into the upper half of the complex
plane will have mirror reflections in the lower half.
5) Angle of Asymptotes: As discussed in Sec. 8.6.1, branches of the root locus
that go to infinity approach asymptotes. The angle (j) that the asymptotes
of the root locus make with the real axis can be computed by
j ¼ 180 degð1 þ 2nÞ
# of OLTF
zeros
 	
 # of OLTF
poles
 	 ¼ 180 degð1 þ 2nÞ
#Z  #P ð8:27Þ
Equation (8.27) must be evaluated at n ¼ 0, 1; 2; . . . ; until the angles
start to repeat.
For example, consider the following OLTF,
GH ¼ K
ðs þ 3Þðs þ 1Þ
Fig. 8.25 	Illustration of root locus real axis location.
CLASSICAL FEEDBACK CONTROL 	417

-- 433 of 650 --

We observe that there are two more poles than zeros telling us that there are
two asymptotes. Using Eq. (8.27) to find the angle of these asymptotes with
respect to the real axis, we have
j ¼ 180 deg
0  2 ¼ 90 deg for n ¼ 0
j ¼ 540 deg
0  2 ¼ 270 deg ¼ 90 deg for n ¼ 1
Notice that we obtain two angles (90 deg) for n ¼ 0 and a check with n ¼ 1
equals the same result. These asymptotes are shown in Fig. 8.26.
6) Asymptote Centroid: The real axis intercept or centroid (s) of the root locus
asymptotes can be found with
s ¼ SPoles  SZeros
#Poles  #Zeros ð8:28Þ
Using the previous example, Eq. (8.28) becomes
s ¼ b3 þ ð1Þc  0
2  0 ¼ 4
2 ¼ 2
The asymptote centroid is also shown in Fig. 8.26.
Example 8.8
Find the real axis location and the angle and centroid of the asymtotes for
the following system:
GH ¼ K
ðs þ 1Þðs þ 2Þðs þ 3Þ
Because we have three poles and no zeros, the real axis location of the root
locus will be between the pole at 1 and 2, and from 3 to negative infinity
Fig. 8.26 	Illustration of angle of asymptotes.
418 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 434 of 650 --

using rule 3. The angle of the asymptotes is next computed using Eq. (8.27).
j ¼ 180 degð1 þ 2nÞ
0  3
 n ¼ 0 ) j ¼ 60 deg ðtwo asymptotesÞ
n ¼ 1 ) j ¼ 180 deg ðone asymptoteÞ
As expected, we have three asymptotes. The centroid is computed with Eq.
(8.28).
s ¼ b1 þ ð2Þ þ ð3Þc  0
3  0 ¼ 2
Finally, we sketch the root locus using this information.
7) Angle of Departure: The angle of departure of the root locus from complex
OLTF pole can be found using the angle criteria. We begin by choosing a
root, s1 , very close to the complex pole such that the angles from the
remaining poles and zeros to s1 are essentially the same as the angles to the
complex pole. For example, consider the OLTF,
GH ¼ K
sðs2 þ 2s þ 2Þ
with open-loop poles at s ¼ 0, 1  j. A root locus is presented in Fig.
8.27.
Applying the angle criteria to s1 , we have
ffGH ¼ ffZeros to s1  ffPoles to s1 ¼ 0  ð90 deg þ 135 deg þ y3Þ
¼ 225  y3 ¼ 180 deg
) y3 ¼ 405 ¼ 45 deg
This result shows that the root locus departs the complex pole at
45 deg. Similarly, the root locus will depart its complex conjugate at
CLASSICAL FEEDBACK CONTROL 	419

-- 435 of 650 --

45 deg using the symmetry rule. Determination of the angle of departure
from complex poles can help refine the shape of the root locus but is not
always necessary.
8) Imaginary Axis Crossing: The imaginary axis crossing point of the root
locus can also be found. At the imaginary axis crossing points we know
that the closed-loop root, s, equals  jo with a zero real component.
Consider the OLTF:
GH ¼ K
sðs þ 3Þðs þ 5Þ
with open-loop poles at s ¼ 0, 3, 5. The closed-loop characteristic
equation is
1 þ GH ¼ s3 þ 8s2 þ 15s þ K ¼ 0
We then substitute in s ¼ jo
ð joÞ3 þ 8ð joÞ2 þ 15jo þ K ¼ 0
Simplifying,
jo3  8o2 þ 15jo þ K ¼ 0
We then separate out the real and imaginary components of the charac-
teristic equation.
Real: 	8o2 þ K ¼ 0
Imaginary: 	jo3 þ 15jo ¼ 0
joðo2  15Þ ¼ 0
and solve the imaginary part to determine o.
o ¼  ffiffiffiffiffi
15
p
Fig. 8.27 	Illustration of angle of departure.
420 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 436 of 650 --

Fig. 8.28
 
Illustration of imaginary axis crossing points.
CLASSICAL FEEDBACK CONTROL 	421

-- 437 of 650 --

We then substitute this result into the real part to determine K.
K ¼ 8ð ffiffiffiffiffi
15
p Þ2 ¼ 120
Therefore, for this example, the root locus crosses the imaginary axis at
o ¼  ffiffiffiffiffi
15
p j with K ¼ 120, as illustrated in Fig. 8.28.
The imaginary axis crossing point is important because it tells us the
point at which the closed-loop system is about to go unstable. In the
previous example, the closed-loop system is stable for K < 120, it has
neutral stability for K ¼ 120, and it is unstable for K > 120.
9) Breakaway Points: Breakaway points are points on the real axis where the
root locus ‘‘breaks away’’ and the closed-loop roots become complex.
Breakaway points can be found by solving for the gain (K) in the closed-
loop characteristic equation, taking the derivative of the gain with respect
to s, and setting it equal to 0. For example, consider the OLTF
GH ¼ K
ðs þ 1Þðs þ 3Þ
with open-loop poles at s ¼ 1, 3. The characteristic equation is
1 þ GH ¼ s2 þ 4s þ 3 þ K ¼ 0
Solving for K we have
K ¼ ðs2 þ 4s þ 3Þ
and taking the derivative and setting it equal to zero:
@K
@s ¼ 2s  4 ¼ 0
We then simply solve the resulting relationship for s to determine the
breakaway point.
s ¼ 2
Figure 8.29 presents the root locus for this example.
In this simple example, the asymptote centroid and the breakaway
point are the same. This is not normally the case.
Example 8.9
Find the asymptote centroid and breakaway point for the following OLTF:
GH ¼ K
s3 þ 8s2 þ 15s
422 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 438 of 650 --

The open-loop poles are located at s ¼ 0, 3, 5. Because there are three
more poles than zeros, the angle of the asymptotes is
j ¼ 180 deg; 60 deg
The asymptote centroid is
s ¼ 3 þ ð5Þ
3 ¼  8
3
To compute the breakaway point, we form the closed-loop characteristic equa-
tion
1 þ GH ¼ s3 þ 8s2 þ 15s þ K ¼ 0
Solving for K,
K ¼ s3  8s2  15s
Taking the derivative with respect to s and setting it equal to zero,
dK
ds ¼ 3s2  16s  15 ¼ 0
We then solve the above equation for s.
s ¼ 4:12; 1:21
Fig. 8.29 	Illustration of breakaway point.
CLASSICAL FEEDBACK CONTROL 	423

-- 439 of 650 --

A plot of the root locus, presented next, will aid in determining if one or both
of these breakaway points are valid.
Because s ¼ 1:12 is part of the root locus real axis location, it is a breakaway
point. The point s ¼ 4:12 is not part of the root locus real axis location and
therefore cannot be a breakaway point. It is discarded. Often, when there are 2
roots, one will correspond to the break-in point (illustrated in Example 8.10).
Notice that in this example, the asymptote centroid and the breakaway point
are not the same.
Example 8.10
Sketch the root locus for the following OLTF using the nine steps discussed
in this section:
GH ¼ Kðs þ 5Þ
ðs þ 2Þðs þ 3Þ Z ¼ 5s ¼ 2; 3
We first observe that the system has one open-loop zero at s ¼ 5 and two
open-loop poles at s ¼ 2, 3.
Step 1: 2 poles ) 2 branches of the root locus
Step 2: Root locus begins at open loop poles and goes to zeros or to 1.
Step 3: A branch is on the real axis if it is to the left of an odd number of poles
and zeros.
Step 4: Root locus is symmetric about the real axis.
Step 5: The angle of the asymptotes is
j ¼ 180 deg
1  2 ¼ 180 deg
424 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 440 of 650 --

because we have one more pole than zero.
Step 6: The centroid of the asymptotes is
s ¼ 5  ð5Þ
2  1 ¼ 0
For the 180 deg asymptote case, we know the asymptote is the negative real
axis and the centroid has little meaning.
Step 7: The departure angle is not needed because we do not have complex open-
loop poles.
Step 8: We do not have an imaginary axis crossing because we do not have
asymptotes that cross the imaginary axis (that is 60 deg). This will be the case if
the difference between OLTF poles and zeros is two or fewer.
Step 9: To find the breakaway point, we determine the roots of dK=ds ¼ 0.
1 þ GH ¼ s2 þ 5s þ 6 þ Ks þ 5K ¼ 0
K ¼ s2  5s  6
ðs þ 5Þ ¼ u
v
and using the chain rule
d u
v
 
¼ vdu  udv
v2
dK
ds ¼ ðs þ 5Þð2s  5Þ  ðs2  5s  6Þð1Þ
ðs þ 5Þ2 	¼ 0
or
s2  10s  19 ¼ 0 ) s ¼ 7:45; 2:55
Thus, potential locations for breakaway points are s ¼ 7:45, 2:55. A plot of
the root locus is presented next. For the locus between the poles 2 and 3,
there is a breakaway point at 2:55. The point at 7:45 is a break in point as
shown. Notice that, after the break-in point, one branch of the root locus goes
to the zero at s ¼ 5 and the other branch goes to the 180-deg asymptote.
CLASSICAL FEEDBACK CONTROL 	425

-- 441 of 650 --

Example 8.11
Sketch the root locus for the following OLTF using the nine steps discussed
in this section
GH ¼ K
ðs þ 1Þðs þ 2Þðs þ 3Þ
Step 1: 3 poles ) 3 branches
Step 2: Root locus begins at open loop poles and goes to zero or 1 (3 branches
go to 1 because we have no zeros).
Step 3: A branch is on the real axis if it is to the left of an odd number of poles
and zeros. Real axis root locus locations are shown in the sketch.
Step 4: Root locus is symmetric about the real axis.
Step 5: The angle of the asymptotes is
j ¼ 180 degð1 þ 2nÞ
0  3
 n ¼ 0 ) j ¼ 180 deg ðone asymptoteÞ
n ¼ 1 ) j ¼ 60 deg ðtwo asymptotesÞ
We have three asymptotes because we have three more poles than zeros.
Step 6: The centroid of the asymptotes is
s ¼ 1 þ ð2Þ þ ð3Þ
3  0 ¼ 2
Step 7: The departure angle is not needed because we do not have complex open-
loop poles.
Step 8: The imaginary axis crossing is determined by substituting s ¼ jo into the
closed-loop characteristic equation.
1 þ GH ¼ 0 ¼ s3 þ 6s2 þ 11s þ 6 þ K
K ¼ s3 þ 6s2 þ 11s þ 6
K ¼ ð joÞ3 þ 6ð joÞ2 þ 11ð joÞ þ 6
K ¼ jo3  6o2 þ 11jo þ 6
426 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 442 of 650 --

Separating into the imaginary and real parts, we have
joðo2  11Þ ¼ 0 ) o ¼ ffiffiffiffiffi
11
p ¼ 3:3166 rad=s
K ¼ 6o2  6 ¼ 6ð3:3166Þ2  6 ¼ 60
Thus, the imaginary axis crossing is at s ¼  j3:3166 for a value of K ¼ 60.
Step 9: To find the breakaway point, we determine the roots of dK=ds ¼ 0
K ¼ s3 þ 6s2 þ 11s þ 6
dK
ds ¼ 3s2  12s  11 ¼ 0 ) s ¼ 1:4226; 2:577
The point s ¼ 1:4226 is on the real axis root locus, therefore it is a break-
away point. The other point, s ¼ 2:577, is not. A sketch of the root locus
plot is provided in Example 8.8.
8.7 	Historical Snapshot—The C-1 Autopilot
One of the first closed-loop systems applied to aircraft was the C-1 autopilot
installed on the B-17E bomber during World War II (see Fig. 8.30).
The C-1 became operational in 1943 and was primarily intended to stabilize
the aircraft during bombing. In preparation for a bomb run, the pilot would
trim the aircraft in straight and level flight and then engage the C-1 autopilot.
The autopilot’s job was to provide a stable platform for the bombardier so that
he could acquire the target and make small corrections to achieve the proper
release point. It also eliminated undesirable aircraft motion during the bomb
release, which contributed to improved accuracy. The C-1 was also used to
relieve pilot fatigue on long flights.
Operation of the C-1 began with potentiometers on the vertical and direc-
tional gyros to sense changes in pitch, roll, and yaw attitude. The electronic
signal from the potentiometers was amplified and input to solenoids and servo-
motors, which were attached to the flight control surfaces through cable drives.
Fig. 8.30 	Boeing B-17 Bomber.
CLASSICAL FEEDBACK CONTROL 	427

-- 443 of 650 --

If a potentiometer sensed a nose-up pitch attitude change, the result was a trail-
ing edge down elevator deflection to correct for the deviation from trim. Simi-
lar feedback loops operated the ailerons and the rudder. The C-1 was built by
Honeywell, Inc. Other 1940s era autopilots used on military aircraft included
the E-4 and the A-12, both of which were built by the Sperry Corporation.
Problems
8.1 	You are given the following block diagram:
(1) 	What is the natural frequency and damping ratio of the open-loop
system?
(2) 	Form the CLTF.
(3) 	At K ¼ 0, what is the characteristic equation?
(4) 	What are the poles and zeros of the open-loop system?
(5) 	Sketch the open-loop poles and zeros on the complex plane.
8.2 	Using the results from Problem 8.1, determine
(1) 	The closed-loop characteristic equation and roots (using the quadra-
tic formula) at K ¼ 0, 1, 5, 10 and 100. Form a table.
(2) 	On the sketch from Problem 8.1, Part (5), plot the movement of the
roots of the CLTF characteristic equation as the gain is varied from
0 to 100.
(3) 	Where does the branch associated with the OLTF pole at s ¼ 6
appear to be going? How about the branch associated with the
OLTF pole at s ¼ 5? What role does the open loop area seem to
be playing? Summarize these results in your own words.
8.3 	The following is a model of pitch displacement autopilot with rate feed-
back:
Determine the CLTF for y=yref . Note, you will have to determine the
CLTF for the inner loop first. KAMP and K rg represent the gain of the
amplifier and the rate gyro, respectively.
428 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 444 of 650 --

8.4 	If a gain, K, is part of the ‘‘G’’ term, you would expect which of the
following to happen?
(a) 	The input to the root locus program would be GH*.
(b) 	The CLTF characteristic equation would not be dependent on the
value of K.
(c) 	The CLTF poles would change as a function of K.
(d) 	None of the above.
8.5 	A pole of the CLTF will be found to be a zero of the 1 þ GH term.
(a) 	True
(b) 	False
8.6 	Which of the following depicts the transfer function for a servo actuator
with a time constant of 0.2 s.
(a) 0:2
s þ 0:2
(b) 5
s þ 5
(c) 0:2
5s þ 1
(d) 5
s þ 0:2
8.7 	For the following system, find CðsÞ
RðsÞ
For a step input, find cðtÞ using a partial fraction expansion.
8.8 	Find Tp, M p, and max overshoot for
CðsÞ ¼ 16
sðs2 þ 4s þ 16Þ
8.9 	Is the following system stable?
TF ¼ 5
s2 þ 8s þ 7
CLASSICAL FEEDBACK CONTROL 	429

-- 445 of 650 --

8.10 Find the OLTF and CLTF for the following system:
8.11 Hand plot the root locus for the following system:
Using K ¼ 0, 1
2, 1, 2, 3, and 1
CLOSED-LOOP ROOT LOCATIONS AS A FUNCTION OF K
K 	s1 	s2
0 	0 þ j0 	2  j0 (open-loop poles)
0:3 þ j0 	1:7  j0
1 	1 þ j0 	1  j0
2 	1 þ j1 	1  j1
3 	1 þ j ffiffiffi
2
p 1  j ffiffiffi
2
p
1 	1 þ j1 	1  j1
8.12 Sketch the root locus for
GH ¼ K
sðs þ 25Þðs2 þ 50s þ 2600Þ
Calculate the number of branches, real axis loci, location, y, and g for
the asymptotes, breakaway points, and departure angles.
430 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 446 of 650 --

8.13 Which set of poles has a higher magnitude of overshoot for x ¼
constant?
Which set of poles has a higher magnitude overshoot for oN ¼ constant?
8.14 Select K1 and K2 for the following system to achieve an oN of 4 and a x
of 0.25.
8.15 Plot the root locus for the following system:
GðsÞ ¼ K
sðs þ 1Þðs þ 5Þ
Plot the modified root locus with the following lead compensators added
and discuss.
(a) 	Gc ¼ s þ 0:75
s þ 7:5
CLASSICAL FEEDBACK CONTROL 	431

-- 447 of 650 --

(b) 	Gc ¼ s þ 1
s þ 10
(c) 	Gc ¼ s þ 1:5
s þ 15
8.16 Why shouldn’t a washout filter be used in cascade?
432 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 448 of 650 --

9
Aircraft Stability and Control Augmentation
The classical feedback control techniques developed in Chapter 8 provide
the foundation for the design of aircraft feedback control systems. The root
locus will be a primary design tool used in this text, but the reader should be
aware that additional analysis methods, such as Bode plots, are also used
extensively by designers. Fortunately, several computer programs have been
developed (such as MATLAB1 (a registered trademark of The MathWorks,
Inc.) and XMATH) that provide a user-friendly generation of root locus plots
and associated open-loop and closed-loop time response characteristics. Two
such programs, Program CC developed by Systems Technology, Inc., and
MATLAB will be used for the generation of root locus plots throughout this
chapter. The detailed discussion of root locus plotting techniques in the last
chapter should provide design insight in developing strategies for improving
dynamic stability characteristics. The reader is encouraged to review the
complex plane time response relationships presented in Sec. 7.2 and the
closed-loop design concepts presented in Chapter 8.
9.1 	Inner-Loop Stability and Control
The dynamic stability characteristics of aircraft have been improved during
the past 50 years using a variety of inner-loop feedback control systems. Inner-
loop simply refers to the fact that these systems are represented as the inner
loop in a block diagram representation when married with outer-loop autopilot
modes such as attitude hold. Although not exact, inner-loop feedback control
systems can be grouped into three broad categories: stability augmentation
systems, control augmentation systems, and fly-by-wire systems.
9.1.1 	Stability Augmentation Systems
Stability augmentation systems (SAS) were generally the first feedback
control system designs intended to improve dynamic stability characteristics.
They were also referred to as dampers, stabilizers, and stability augmenters.
Aircraft such as the F-104, T-37, T-38, and F-4 had SAS. These systems gener-
ally fed back an aircraft motion parameter, such as pitch rate, to provide a
control deflection that opposed the motion and increased damping characteris-
tics. The SAS had to be integrated with the primary mechanical control system
of the aircraft consisting of the stick, pushrods, cables, and bellcranks leading
to the control surface or the hydraulic actuator that activated the control
surface. The control authority (percentage of full surface deflection available)
433

-- 449 of 650 --

of SAS was generally limited to about 10%. Fig. 9.1 presents a simplified
SAS.
One problem with SAS was the fact that the feedback loop provided a
command that opposed pilot control inputs. As a result, the aircraft became
less responsive for a given stick input. This was typically addressed with the
addition of a washout filter in the feedback loop that attenuated the feedback
signal for constant values of the aircraft motion parameter. A block diagram of
a typical SAS is presented in Fig. 9.2.
Another concern was the limited authority of the SAS actuator that was
necessitated by safety-of-flight requirements. SAS sensors and computers were
normally nonredundant or dual redundant and thus did not approach the
system reliability of the mechanical flight control system. Despite these con-
cerns, SAS was effective in improving aircraft flying qualities.
9.1.2 	Control Augmentation Systems
The next step in the evolution of aircraft feedback control was control
augmentation systems (CAS). CAS added a pilot command input into the
flight control computer. A force sensor on the control stick was usually used to
provide this command input. With a CAS, a pilot stick input is provided to the
flight control system in two ways—through the mechanical system and through
the CAS electrical path. The CAS design eliminated the SAS problem of pilot
Fig. 9.1 	Simplified SAS.
Fig. 9.2 	Typical SAS block diagram.
434 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 450 of 650 --

inputs being opposed by the feedback loop. Aircraft such as the A-7, F-111,
F-14, and F-15 have CAS. Figure 9.3 presents a simplified CAS.
Additional reliability was designed into CAS so that the control authority
could be increased (to approximately 50%). With a CAS, the aircraft dynamic
response is typically well-damped, and control response is scheduled with the
control system gains to maintain desirable characteristics throughout the flight
envelope. A block diagram for a typical CAS is presented in Fig. 9.4.
CAS provided dramatic improvements in aircraft handling qualities. Both
dynamic stability and control response characteristics could be tailored and
optimized to the mission of the aircraft. One pioneering exploratory develop-
ment program in the early 1970s, the A-7D Digital Multimode Flight Control
System Program, developed specific feedback flight control designs using a
CAS and an A-7D aircraft, which tailored the aircraft’s handling qualities to
specific mission tasks such as air-to-air tracking and air-to-ground gunnery.
9.1.3 	Fly-By-Wire Systems
Based on the excellent handling qualities achieved with CAS, the next logi-
cal step in feedback control systems development was to remove the mechani-
Fig. 9.3 	Simplified CAS.
Fig. 9.4 	Typical CAS block diagram.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	435

-- 451 of 650 --

cal control system and provide the CAS full authority. Such systems are
known as fly-by-wire (FBW) systems. This major step involved proving that
the reliability of the FBW system, composed of mostly electrical components,
was equal to or better than the trusted mechanical system. To achieve this relia-
bility, triple and quad redundancy in system components, along with self-test
software is used. Aircraft such as the F-16, C-17, and F-22 have FBW systems.
In the case of the F-22, another term, fly-by-light, is sometimes used to indi-
cate that fiberoptic links are used rather than wire. The full authority provided
by FBW allows very significant tailoring of stability and control characteristics.
This ability has led to FBW systems with several feedback parameters and
weighting of feedback gains based on flight condition and other parameters.
Figure 9.5 presents a simplified FBW system.
Block diagrams for FBW systems can become complex because of the
number of feedback sensors involved. Figure 9.6 presents a simplified block
diagram for the F-16 longitudinal FBW system.
9.1.4 	Typical Inner-Loop Systems
Several inner-loop systems will be discussed and analyzed in this section.
The general analysis techniques developed in Chapter 8 will be used exten-
sively.
9.1.4.1 	Yaw damper. 	A yaw damper is primarily used to improve dutch
roll characteristics. Good dutch roll characteristics are essential to tight tracking
tasks such as air-to-air refueling, formation flying, approach, air-to-air tracking,
and air-to-ground tracking. To illustrate the design of a yaw damper, we will start
with an approximation of the _cc=dr transfer function 1 for the C-5 at 0.22 Mach,
sea level, in the power approach configuration (gear and flaps down)
_cc
dr
¼  0:213ðs þ 1:2Þðs2 þ 0:6s þ 0:1525Þ
ðs þ 0:028Þðs þ 1:13Þðs2 þ 0:24s þ 0:2848Þ
Fig. 9.5 	Simplified FBW system.
436 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 452 of 650 --

Figure 9.7 presents a yaw damper configuration based on the SAS approach
presented in Fig. 9.2, except that the gain is located in the feedback path.
The washout filter in Fig. 9.7 will drive the feedback signal to zero after a
steady-state or relatively constant yaw rate is achieved. This prevents the yaw
damper from fighting a pilot command. The washout can be thought of in
general terms as
ts
ts þ 1
where t is the time constant that determines the pace at which the feedback
signal is driven to zero. Figure 9.8 presents the time response of a washout
filter to a unit step input.
In this figure, the unit step occurs at time equal to zero, and the full signal
is immediately passed through the washout filter. Because the unit step input
stays constant for time greater than zero, the attenuation provided by the wash-
out is faster for smaller values of time constant.
A root locus plot for the yaw damper of Fig. 9.7 is presented in Fig. 9.9.
The plot focuses on the dutch roll roots that have an open-loop damping ratio
Fig. 9.7 	Yaw damper block diagram.
Fig. 9.6 	Simplified F-16 longitudinal FBW block diagram.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	437

-- 453 of 650 --

of 0.2227 and a natural frequency of 0.532 rad=s. By closing the loop with a
gain (K) of 4.277, we can achieve a damping ratio of 0.5 and a natural fre-
quency of 0.5011 rad=s. The roots of the closed-loop system are also shown in
Fig. 9.9.
Notice that even higher values for dutch roll damping ratio could be
obtained with higher values of K. Also notice that the dutch roll natural
frequency remains fairly constant throughout the gain range as discussed for
the case of rate feedback in Sec. 8.3. Figure 9.10 presents the open-loop and
closed-loop time response to a unit impulse input.
The open-loop response clearly shows the oscillations associated with a
0.2227 damping ratio. As expected, the closed-loop response is more heavily
Fig. 9.8 	Unit step time response of a washout filter with three different time
constants.
Fig. 9.9 	Yaw damper root locus plot focusing on dutch roll roots.
438 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 454 of 650 --

damped. The full root locus plot for the yaw damper is presented in Fig. 9.11
so that the migration of the other poles can be observed. Note the uneven
scales.
Closing the loop moves the actuator pole from 15 to approximately 14
(a slightly slower time constant). The spiral root at 0:028 moves to 0:0187
(still stable but a slower time constant), the roll mode root moves from 1:13
to 1:65 (a faster time constant), and the root added by the washout filter
moves from 1 to 1:24.
To make the yaw damper more effective throughout the aircraft flight envel-
ope, the gain, K, may be scheduled with dynamic pressure or other flight para-
meters. Definition of the gain schedule involves analysis of transfer functions
representative of the entire aircraft flight envelope and selection of a gain value
Fig. 9.10 	Yaw damper time response to an impulse input.
Fig. 9.11 	Complete yaw damper root locus.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	439

-- 455 of 650 --

appropriate to each. A schedule is then developed that defines the gain as a
function of flight condition. In addition, selection of the washout filter time
constant will affect the value of the gain needed to obtain the desired stability
characteristics.
9.1.4.2 	Pitch damper. 	A pitch damper is primarily used to improve short
period characteristics. Good short period characteristics are critical to the same
tight tracking tasks as for dutch roll. To illustrate the design of a pitch damper, we
start with an approximation 1 of the _yy=de transfer function for the A-7D at 0.6
Mach, 15,000 ft, in the cruise configuration (gear and flaps up).
_yy
de
¼ 18:1sðs þ 0:00716Þðs þ 1:09Þ
ðs2 þ 1:98s þ 9:92Þðs2 þ 0:0088s þ 0:00506Þ
Figure 9.12 presents a pitch damper configuration based on the CAS approach.
Notice that a washout filter is not included.
The pitch damper root locus is presented in Fig. 9.13. It focuses on the
short period roots that have an open-loop damping ratio of 0.3184 and a
natural frequency of 3.14 rad=s. By closing the loop with a gain of 0.1592, we
Fig. 9.12 	Pitch damper block diagram.
Fig. 9.13 	Pitch damper root locus plot focusing on short period roots.
440 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 456 of 650 --

achieve a damping ratio of 0.7 and a natural frequency of 3.98 rad=s. The roots
of the closed-loop system are also shown in Fig. 9.13.
Here again, even higher values of short period damping could be achieved
with higher values of K. The short period natural frequency does increase
because this system is more complex than the simple second-order example
used in Sec. 8.3. Figure 9.14 presents the open-loop and closed-loop time
response to a unit step input.
As expected, the closed-loop response is more heavily damped. The full
root locus plot for the pitch damper is presented in Fig. 9.15 so that migration
of the actuator pole can be observed.
Notice that the actuator pole moves from 20 to approximately 16:5 (a
slightly longer time constant). Migration of the phugoid roots is difficult to
Fig. 9.14 	Pitch damper time response to an impulse input.
Fig. 9.15 	Complete pitch damper root locus.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	441

-- 457 of 650 --

observe in Figs. 9.13 and 9.15 because of the relatively large scale. Figure
9.16 presents a focused view of the phugoid roots that are concentrated around
the origin.
The phugoid roots only move slightly with a very small increase in damping
ratio and decrease in natural frequency.
9.1.4.3 	Angle of attack feedback. 	Angle of attack (AOA) feedback can
be used to increase short period natural frequency and the static stability of the
aircraft (C ma ). Modern aircraft with relaxed static stability in the basic airframe
design will use AOA feedback to return static stability characteristics to the
closed-loop aircraft (see Fig. 9.6 for the F-16). To illustrate the design of an AOA
feedback system, we will start with an approximation (see Ref. 1) of the a=de
transfer function for the F-16 at 135 kn true airspeed and sea level in the power
approach configuration.
a
de
¼ 0:083ðs2 þ 0:086s þ 0:0594Þðs þ 35:4Þ
ðs2 þ 0168s þ 0:0832Þðs þ 1:75Þðs  0:4825Þ
Notice that one of the roots is positive, making the aircraft statically unstable.
This is typical for aircraft with the c.g. aft of the aerodynamic center. Advan-
tages of designing an aircraft with basic airframe static instability include
reduced horizontal stabilizer size and quicker longitudinal response. Of course,
a closed-loop system must be added to provide apparent static stability. Figure
9.17 presents an AOA feedback configuration.
A simplified root locus for the AOA feedback system is presented in Fig.
9.18. Notice that closing the loop causes the unstable root to move into the
stable region of the complex plane. The two open-loop oscillatory roots move
to the real axis, one moving toward the origin and the other moving to the left.
We then have two breakaway points that form branches for the more recogniz-
Fig. 9.16 	Pitch damper root locus focusing on phugoid roots.
442 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 458 of 650 --

able short period (roots away from the origin) and phugoid (roots close to the
origin) second-order roots. For illustration, we select a gain of K ¼ 0:415,
which provides a short-period damping ratio of 0.9 and a natural frequency of
0.715 rad=s. The closed-loop phugoid mode has a damping ratio of 0.942 and
a natural frequency of 0.0643 rad=s.
Even larger values of gain will give the aircraft more recognizable short-
period and phugoid roots. AOA feedback requires an accurate AOA measure-
ment, a sometimes difficult parameter to measure with high fidelity.
9.1.4.4 	Load factor feedback. 	Another method that may increase short-
period damping ratio is load factor feedback. It has the added benefit of helping to
linearize the stick force gradient (stick force=g) of the aircraft. To develop the
n=de transfer function, we approximate the perturbed load factor as
n ¼ U1 _gg
g
Fig. 9.17 	AOA feedback block diagram.
Fig. 9.18 	Simplified AOA feedback root locus.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	443

-- 459 of 650 --

where U1 _gg is the centripetal acceleration acting on the aircraft because of the
rotation of the velocity vector and g is 32.2 ft=sec 2 in the English system.
Recall that the flight path angle (g) is the angle between the aircraft velocity
vector and the horizon. Because g ¼ y  a,
n
de
¼ U1 _ggðsÞ
32:2deðsÞ ¼ U1s
32:2
yðsÞ
deðsÞ  aðsÞ
deðsÞ
 	
ð9:1Þ
For the A-7D at 0.6 Mach and 15,000 ft (see Ref. 1), the n=de transfer function
is approximated by
n
de
¼ 19:7sð0:157s3  0:8977s2 þ 19:77s þ 0:1122Þ
ðs2 þ 1:98s þ 9:92Þðs2 þ 0:0088s þ 0:00506Þ
Figure 9.19 presents a load factor feedback configuration.
The load factor feedback root locus scaled to show the phugoid roots is
presented in Fig. 9.20. Notice that the short period roots become more stable
as K is increased. However, the phugoid roots quickly become unstable with
an increase in K, as shown in Fig. 9.21. As a result, we select a value of gain
that will increase the damping of the short-period mode while keeping the
phugoid stable. A gain of 0.016 is selected that results in a short-period damp-
ing ratio of 0.658 and a natural frequency of 1.91 rad=s. With K ¼ 0:016, the
phugoid has a damping ratio of 0.037 and a natural frequency of 0.114 rad=s.
A multiloop system that incorporates both rate and load factor feedback are
common on modern high-performance aircraft.
9.2 	Outer-Loop Autopilot=Navigation Control
Most airplanes are equipped with pilot-relief or autopilot functions. These
systems take control of the aircraft and perform holding or navigation func-
tions. Since the pilot is not directly in the loop as with inner-loop stability and
control, the autopilot modes are referred to as outer-loop functions. Four
selected autopilot functions will be presented in this section. Several others are
needed for a complete autopilot. More detailed texts provide an analysis of
most autopilot functions. The intent of this text is to familiarize the reader with
design approaches and not to provide a complete discussion of all possible
configurations.
Fig. 9.19 	Load factor feedback block diagram.
444 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 460 of 650 --

Fig. 9.21 	Load factor feedback root locus showing closed-loop phugoid poles.
Fig. 9.20 	Load factor feedback root locus plot.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	445

-- 461 of 650 --

9.2.1 	Pitch Attitude Hold
A pitch attitude hold mode provides automatic control of pitch attitude with
a closed-loop feedback system. It is a mode which can significantly reduce
pilot workload in turbulent air. To illustrate the design of a pitch attitude hold
system, we return to the A-7D pitch damper block diagram presented in Fig.
9.12 with the output modified to pitch attitude (Fig. 9.22).
The attitude hold root locus for the previous system is presented in Fig.
9.23. Notice that as K is increased, the damping ratio decreases and the natural
frequency increases. Figure 9.24 presents an expanded view of this root locus
focusing on the short period roots.
If K ¼ 0:215 is selected, the short-period damping ratio decreases from
0.313 to 0.2. The short-period natural frequency increases from 3.16 rad=s to
3.6 rad=s. Of course, we must not lose sight of our original purpose for closing
the attitude hold loop, incorporation of the automatic pilot relief mode. Pitch
attitude feedback has the added advantage of increasing the damping ratio of
the phugoid mode.
Fig. 9.23 	Pitch attitude hold root locus plot.
Fig. 9.22 	Pitch attitude hold block diagram.
446 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 462 of 650 --

9.2.2 	Altitude Hold
Altitude hold is another important outer-loop autopilot mode. Simply stated,
a feedback loop is used to keep altitude (h) constant using the elevator as the
controller. We begin by deriving the h=de transfer function. In Sec. 3.6 we
found that the rate of climb (ROC) was
ROC ¼ _hh ¼ U1 sin g  U1g
Taking the Laplace transform,
shðsÞ ¼ U1gðsÞ
and forming the desired transfer function,
hðsÞ
deðsÞ ¼ U1
s
gðsÞ
deðsÞ
 	
Because g ¼ y  a, the altitude to elevator transfer function becomes
hðsÞ
deðsÞ ¼ U1
s
yðsÞ
deðsÞ  aðsÞ
deðsÞ
 	
ð9:2Þ
For the A-7D at 0.6 Mach and 15,000 ft, the h=de transfer function is approxi-
mated by Ref. 1.
h
de
¼ 634ð0:157s3  0:8977s2 þ 19:77s þ 0:1122Þ
sðs2 þ 1:98s þ 9:92Þðs2 þ 0:0088s þ 0:00506Þ
Figure 9.25 presents an altitude hold configuration.
Fig. 9.24 	Pitch attitude hold root locus focused on short period roots.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	447

-- 463 of 650 --

Notice that a lag with a time constant of 1 s has been added to the feedback
loop to simulate the lag associated with barometric altimeters. The altitude
hold root locus is presented in Fig. 9.26.
Notice that with a low value of gain (K ¼ 0:00218) the short-period roots
can be kept stable. However, the zero in the right-half plane causes one of the
closed-loop roots to be unstable. To solve this problem, two approaches can be
used. A pitch attitude feedback can be added (as in Sec. 9.2.1), or a compensa-
tion filter can be designed and incorporated into the block diagram that will
alter the root locus branches so that a gain can be selected, which keeps all
seven roots stable (compensation is discussed in Sec. 9.3).
Fig. 9.26 	Altitude hold root locus.
Fig. 9.25 	Altitude hold block diagram.
448 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 464 of 650 --

9.2.3 	Bank Angle Hold
A complete autopilot is made up of several feedback loops to take care of
the many functions that come naturally to a pilot. Another autopilot loop is
bank angle hold, which is sometimes called the wing leveller, when the
commanded bank angle is zero (typical of cruising flight). To illustrate the
design of a bank angle hold system, we will use the y=da transfer function
using the one-degree-of-freedom (DOF) roll approximation (Sec. 7.3.3.2) for
the F-4 at 0.9 Mach and 35,000 ft (Ref. 1).
f
da
¼ 9:74
sðs þ 1:23Þ
Figure 9.27 presents a bank angle hold configuration.
The bank angle hold root locus is presented in Fig. 9.28. Notice that the
two poles in the f=da transfer function become complex conjugates for the
closed-loop case with a value of K ¼ 0:077. For this case, the damping ratio
decreases from 1 to 0.66. Also, as seen from the root locus, the gain cannot be
increased to large values or the system will go unstable.
Fig. 9.27 	Bank angle hold block diagram.
Fig. 9.28 	Bank angle hold root locus.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	449

-- 465 of 650 --

9.2.4 	Heading Hold
Autopilot control of aircraft heading is another outer-loop function that can
reduce pilot workload. Because heading corrections are usually made by bank-
ing (and turning) the aircraft, a heading hold system usually involves a multi-
loop approach with a bank angle hold system used as the inner loop. A bank
angle gyro and a heading angle gyro are needed in this type of system. To
draw the block diagram, a Laplace relationship between heading angle and
bank angle is needed. This is presented next and was derived from the level
turn relationships in Sec. 3.9.2.
cðsÞ
fðsÞ ¼ g
U1sÞ ð9:3Þ
For the F-4 at 0.9 Mach and 35,000 ft (the same conditions as used in the
bank angle hold example), this becomes c=f ¼ 0:0368=s. We can now
develop the block diagram for the heading hold mode. The inner-loop bank
angle hold system can be thought of as the controller that provides corrections
to the heading angle through a level turn. Figure 9.29 presents a heading hold
configuration using the 1-DOF roll approximation.
Using the gain selected for the inner-loop in the previous example
(Kf ¼ 0:077) and Eq. (8.11), the inner-loop closed-loop transfer function
(CLTF) becomes:
f
fcommand
¼ 11:25
s3 þ 16:23s2 þ 18:45s þ 11:25
Multiplying this by Eq. (9.3) (with values for the F-4), we have
c
fcommand
¼ 0:414
sðs3 þ 16:23s2 þ 18:45s þ 11:25Þ
which is the basis for generating the root locus for the outer loop. The outer
loop root locus is presented in Fig. 9.30. Notice that the open-loop poles are
precisely the same as the inner-loop (closed-loop) poles defined in the previous
example. A Kc of 7.86 was selected for the outer loop, which provided a
damping ratio of 0.5 for the complex conjugate roots.
Fig. 9.29 	Heading hold block diagram.
450 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 466 of 650 --

9.3 	Compensation Filters
Another powerful tool available to the control system designer is a compen-
sation filter. Compensation filters can take a variety of forms and are very
effective in tailoring the aircraft response. We will look at three types of
compensation filters, but several more are in common use.
In a generic feedback control system, a compensation filter can be located
in generally three possible positions, as shown in Fig. 9.31.
Prefilter compensation modifies the CLTF directly, while forward path and
feedback compensation modify the forward path and feedback path transfer
functions, which are inputs for the root locus.
The compensation filters that will be discussed add an equal combination of
poles and zeros. Prefilter compensators generally use the principle of cancella-
tion of an undesirable closed-loop pole with a prefilter zero, and cancellation
of a closed-loop zero with a prefilter pole. Having worked with several root
locus plots at this point, a few general observations can be made: open-loop
zeros attract branches of the root locus, open-loop zeros in the right half of the
complex plane will draw closed-loop roots into the unstable region for certain
Fig. 9.31 	Possible locations of compensation filters.
Fig. 9.30 	Outer-loop heading hold root locus.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	451

-- 467 of 650 --

values of K, and closed-loop roots near the origin of the complex plane
provide a slow component (large time constant) of the time response. Forward
path and feedback path compensation filters allow modification of the root
locus through the addition of poles and zeros in desirable locations.
The filters are generally implemented in the flight control computer and can
be thought of as added software for digital systems and additional circuitry for
analog systems. A more detailed discussion of compensation filter implementa-
tion is available in several texts.
9.3.1 	Lead Compensator
Lead compensators are generally used to quicken the system response by
increasing natural frequency and=or decreasing time constant. Lead compensa-
tors also increase the overall stability of the system. A lead compensator has
the general form
TF 	lead
compensator
¼ bðs þ aÞ
aðs þ bÞ a < b 	ð9:4Þ
The b=a in Eq (9.4) simply keeps the steady-state value of the compensator as
one. The practical limit in choosing the pole and zero for the lead compensator
is b < 10a. A common application of lead compensators is to cancel a pole at
s ¼ a, which is slowing the time response or causing the system to be
unstable. A washout filter, as discussed with rate feedback, is a special case of
a lead compensator.
Example 9.1
Design a prefilter lead compensator to decrease the time constant of the
following system to less than 0.2 s.
The time response of the system will be composed of two components, each
directly dependent on the characteristics of the two poles. Notice that the pole
at s ¼ 1 has a time constant of approximately 1 s. The pole at s ¼ 20 has a
time constant of 1=20th of a second and is not a problem. A simple lead
compensator can be used to cancel the problem pole.
Notice also that we have cancelled the zero at s ¼ 5 with the pole on the
lead compensator. The next figure shows the time response characteristics with
452 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 468 of 650 --

and without the lead compensator.
Forward-path or feedback-lead compensation can also be used to shift the root
locus to the left.
Example 9.2
Design a forward-path lead compensator for the following system that will
shift the root locus to the left.
The root locus for the uncompensated system follows:
We add a forward-path compensator that will place a pole and zero to the left
of the two open-loop poles. The root locus is attracted to the compensator zero
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	453

-- 469 of 650 --

at s ¼ 5.
The compensated root locus is presented next. Notice that the vertical branches
have shifted to the left.
9.3.2 	Lag Compensator
Lag compensators are generally used to slow the system response by decreas-
ing natural frequency and=or increasing time constant. They also tend to
decrease the overall stability of the system. A lag compensator has the general
form
TF 	lag
compensator
¼ bðs þ aÞ
aðs þ bÞ a > b 	ð9:5Þ
With lag compensation, a pole is added to the right of a zero. The pole may be
used to cancel a zero, or it may be used to shift the root locus to the right.
Lag compensation may also reduce the steady-state error of a system, a topic
discussed in Sec. 10.1.
Example 9.3
For the same system defined in Example 9.2, design a feedback path lag
compensator that will shift the root locus to the right.
454 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 470 of 650 --

The lag compensator pole is placed at s ¼ 3 to repel the root locus to the
right.
The root locus for the compensated system is presented next. Notice that the
root locus branches have shifted to the right.
9.3.3 	Lead-Lag Compensator
The combined benefits of a lead compensator and a lag compensator may
be realized using lead-lag compensation. A lead-lag compensator has the
general form
TF lead- lag
compensator
¼ bdðs þ aÞðs þ cÞ
ACðs þ bÞðs þ dÞ a > b; a < c; c < d 	ð9:6Þ
The ðs þ aÞ=ðs þ bÞ component represents the lag filter, and the ðs þ cÞ=ðs þ dÞ
component represents the lead filter. Each component will have the same type
of effect on a root locus as discussed in the previous two sections. A lead-lag
compensator normally adds two zeros that are fairly close together and that
provide a powerful attraction for root locus branches. In many cases, the useful
gain range (before a system goes unstable) can be increased using a lead-lag
compensator.
Another common use of lead-lag compensators is the attenuation of a speci-
fic frequency range (sometimes called a notch filter). For example, an aircraft
structural resonant frequency can be filtered out with a lead-lag compensator if
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	455

-- 471 of 650 --

a feedback sensor is erroneously affected by that frequency. Design of such
filters is easily done using Bode plots, which are discussed in Chapter 10.
Example 9.4
Starting with the following system, design a lead-lag feedback path compen-
sator that will provide for stable roots at higher values of K.
We begin by reviewing the root locus for the previous system.
The two complex branches of the root locus go unstable for values of K
greater than 391. To allow for a larger range of stable gain values, we add the
feedback path lead-lag compensator
1:5ðs þ 4:5Þðs þ 4Þ
ðs þ 3Þðs þ 9Þ
456 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 472 of 650 --

that places two zeros to the left of the pole at 2.
The resulting root locus is:
The two complex branches of the compensated root locus now go unstable for
K values greater than 588. Thus, we have gained a larger range of stable
values of K. As discussed in Chapter 10, this will have a positive effect on the
steady-state error of the system. Of course, additional analysis is necessary to
determine if this design is acceptable. The example is intended to simply illus-
trate the effect that a lead-lag compensator can have on the root locus.
9.4 	Combined Systems
Modern aircraft combine many or all of the functions discussed in Secs. 9.1
and 9.2, along with additional functions not discussed in this text. The inner-
loop stability=control functions are normally designed first, followed by the
outer-loop autopilot modes. In many cases, autopilot functions tend to have an
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	457

-- 473 of 650 --

adverse effect on dynamic stability characteristics, and the design of inner and
outer loops must be accomplished concurrently. This is best understood with
an example.
Example 9.5
Develop an autopilot for the DC-8 that will maintain aircraft pitch angle, y,
and will have an overall damping ratio of the short period mode of z ¼
0:55  0:01. Use an actuator with a 0.1-s time constant and the following DC-
8 transfer function based on the short period approximation.
y
de
¼ 1:39ðs þ 0:306Þ
sðs2 þ 0:805s þ 1:325Þ
First, we look at a displacement autopilot for the DC-8 using only y feed-
back. Our initial autopilot is
The transfer function for input to the root locus is
G*H ¼ 13:9ðs þ 0:306Þ
ðs þ 10Þsðs2 þ 0:805s þ 1:325Þ
The root locus is
While this autopilot has stable short-period roots for a limited range of K AMP
(0 to 3.65), it fails our requirement of z ¼ 0:55 because the maximum short-
458 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 474 of 650 --

period damping ratio is 0.35, which occurs at the open-loop poles. As seen
from the root locus, the damping ratio decreases as K AMP is increased and a
damping ratio of 0.55 cannot be achieved with this feedback configuration.
Therefore, this system is unsatisfactory. It is important to note the migration
tendency of the short-period root locus with pitch attitude feedback: as K AMP
is increased, the damping ratio decreases and eventually the system goes
unstable.
To meet the short-period damping ratio requirement, we will add an inner-
loop utilizing pitch rate _yy feedback and a rate gyro. Recall
_yyðsÞ
deðsÞ ¼ s yðsÞ
dðsÞ ¼ 1:39ðs þ 0:306Þ
s2 þ 0:805s þ 1:325
The new autopilot with _yy and y inner and outer loops is
The root locus transfer function for the inner loop is
GH* ¼ 13:9ðs þ 0:306Þ
ðs þ 10Þðs2 þ 0:805s þ 1:325Þ
The inner-loop root locus is
With rate feedback, notice that as Krg is increased, the short period damping
ratio is increased from the open-loop value of 0.35. To obtain an overall
system response of z ¼ 0:55, we must select a damping ratio for the inner loop
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	459

-- 475 of 650 --

larger than 0.55 because we know that closure of the outer loop will decrease
as the damping ratio as K AMP is increased. The choice of the inner loop z (and
the Krg needed to obtain it) is typically a compromise between the desirability
of rapid response and the desire to reduce excessive overshoot. For our inner
loop we select a z ¼ 0:7, which is obtained with Krg ¼ 0:6577. The closed-
loop system for the inner loop is
_yy
e a
¼
13:9ðs þ 0:306Þ
ðs þ 10Þðs2 þ 0:805s þ 1:325Þ
1 þ ð0:6577Þð13:9Þðs þ 0:306Þ
ðs þ 10Þðs2 þ 0:805s þ 1:325Þ
¼ G
1 þ GH
or, in simplified form,
_yy
e a
¼ 13:9ðs þ 0:306Þ
s3 þ 10:805s2 þ 18:52s þ 16:05
The block diagram for the system with Krg ¼ 0:6577 can be represented as
The next step is to find a K AMP such that the overall damping ratio is 0.55.
The root locus transfer function for the outer loop is
G*H ¼ 13:9ðs þ 0:306Þ
sðs3 þ 10:805s2 þ 18:52s þ 16:05Þ
The outer-loop root locus is
460 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 476 of 650 --

This looks like the root locus for the autopilot with y feedback; however, the
open-loop poles are now at z ¼ 0:7 because of the inner-loop utilizing rate (_yy)
feedback. By selecting K AMP ¼ 0:4688, we can obtain an overall system damp-
ing ratio that meets our requirement of z ¼ 0:55  0:01.
The CLTF for the autopilot is
y
yREF
¼ G
1 þ GH ¼
ð0:4688Þð13:9Þðs þ 0:306Þ
sðs3 þ 10:805s2 þ 18:52s þ 16:05Þ
ð0:4688Þð13:9Þðs þ 0:306Þ
sðs3 þ 10:805s2 þ 18:52s þ 16:05Þ
Notice that K AMP is in the forward path and appears as part of G when forming
the CLTF. This simplifies to
y
yREF
¼ 6:52ðs þ 0:306Þ
s4 þ 10:805s3 þ 18:52s2 þ 22:56s þ 1:99
or
y
yREF
¼ 6:52ðs þ 0:306Þ
ðs þ 0:0954Þðs2 þ 1:68s þ 2:31Þðs þ 9:028Þ
The pitch displacement autopilot with Krg ¼ 0:6577 and KAMP ¼ 0:4688 can
be represented as
If we input a unit step, yREF ¼ 1=s, the time response of y is
While the response has a sufficient damping ratio (z ¼ 0:55), it takes more
than 40 s to reach steady state. This is because of the root near the origin at
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	461

-- 477 of 650 --

s ¼ 0:0954. This root has a large time constant that slows the time response.
Although not specifically requested, we can significantly improve the time
response with the addition of a prefilter lead compensator to eliminate the pole
and zero near the origin. The lead compensator to do this is
TF- lead
compensator
¼ 0:306ðs þ 0:0954Þ
0:0954ðs þ 0:306Þ
This prefilter compensator will eliminate the pole at s ¼ 0:0954 and zero at
s ¼ 0:306 and hence should improve the time response. The system with the
lead compensator is
or equivalently,
The equivalent block diagram represents a system where the slow pole and
zero have been eliminated. The time response of the compensated autopilot to
a unit step input, is now
Notice that the time response has been significantly improved with the lead
compensator. Recalling our discussion of time-response characteristics in Sec.
8.5, the compensated pitch attitude autopilot design has a rise time of 1.176 s,
a time to peak of 2.59 s, and a 5% settling time of 3.593 s. A complete block
462 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 478 of 650 --

diagram of our final system is
9.5 	Historical Snapshot—The A-7D DIGITAC Digital Multimode
Flight Control System Program
During the mid-1970s, the Air Force Flight Dynamics Laboratory, the Air
Force Flight Test Center, and Honeywell, Inc., developed and flight tested the
first digital and multimode control augmentation system in history. 2,3 This
program provided an important, sequential step in the evolution of flight
control systems from simple analog stability augmentation to much more
capable digital system mechanizations with control laws specifically tailored to
individual mission tasks. The test aircraft for the program was the second
prototype A-7D shown in Fig. 9.31.
The system also addressed the difficult problem of increasing system relia-
bility and providing passive system failures. Fail-operational, fail-safe capabil-
ity was achieved for failures of the dual-redundant system through the use of
Fig. 9.32 	A-7D DIGITAC test aircraft.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	463

-- 479 of 650 --

in-line, self-test software that ran continuously during system operation. This
approach led directly to the triple channel, ‘fail-op, fail-op, fail-safe’ systems
now in modern aircraft. Figure 9.33 presents the redundancy management
mechanization.
The multimode control laws consisted primarily of a flight path (FP) mode
and a precision attitude (PA) mode. Both were implemented via software in the
digital computers using a CAS approach. The FP mode was designed to
enhance control of aircraft flight path at the expense of aircraft attitude.
Related mission tasks included large combat maneuvers and fine flight-path
Fig. 9.33 	A-7D DIGITAC redundancy management approach.
464 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 480 of 650 --

tracking. This mode provided rapid yet well damped normal acceleration and
roll rate response to control stick inputs. The PA mode was designed to
enhance control of aircraft 	attitude. Appropriate mission tasks included
gunnery and air-to-air tracking. This mode provided rapid yet well damped
pitch rate and roll-rate response. Turn coordination was task related. A select-
able gunnery submode of PA forced the aircraft to roll about the bullet stream
during roll corrections to reduce the pendulum effect associated with terminal
tracking. Figures 9.34–9.36, present the pitch, roll, and yaw axis control laws.
During the flight-test program, quantitative tracking data were obtained to
evaluate the effectiveness of each mode as compared to the standard A-7D
flight control system. Comparison time history data of gunsite pipper position
are presented in Fig. 9.37 for a typical gunnery pass.
Overall, a 38% average reduction in air-to-air and air-to-ground tracking
error was demonstrated during the program with the PA mode. Few advantages
were found with the FP mode. The program also proved the feasibility of digi-
tal implementation of flight control computations, paving the way for similar
systems in the Space Shuttle, F-15, F-16, and F-22.
Fig. 9.34 	DIGITAC pitch axis control laws.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	465

-- 481 of 650 --

Fig. 9.35 	DIGITAC roll axis control laws.
466 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 482 of 650 --

Fig. 9.36 	DIGITAC yaw axis control laws.
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	467

-- 483 of 650 --

Fig. 9.37
 
Time history of gunnery passes for standard A-7D and DIGITAC PA mode.
468 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 484 of 650 --

References
1 USAF Test Pilot Scholl, Flight Control Systems, chapter 14, Edwards AFB, CA, 1988.
2 Yechout, T. R., and Oelschlaeger, D. R., ‘‘Flight Test Evaluation of a Digital Multimode
Flight Control System in an A-7D Aircraft,’’ AIAA TP 76-1913, AIAA Guidance and
Control Conference, San Diego, CA, Aug. 1976
3 Yechout, T. R., and Oelschlaeger, D. R., ‘‘DIGITAC Multimode Flight Control
System,’’ AIAA TP 75-1085, AIAA Guidance and Control Conference, Boston, Aug. 1975.
Problems
9.1 	The following is a block diagram for a roll control autopilot for a jet
fighter:
Determine
(1) 	the OLTF and the CLTF.
(2) 	the poles and zeros of the OLTF and CLTF.
Sketch the root locus for this autopilot as the amplifier gain is varied
from 0 to infinity. Be sure to determine
(a) 	the number of branches required.
(b) 	where the root locus exists on the real axis.
(c) 	where it crosses the imaginary axis.
(d) 	where it breaks away from the real axis.
(e) 	the gain where it crosses the imaginary axis.
9.2 	For a pitch attitude hold autopilot, the short period damping ratio tends
to 	as K is increased.
(1) 	increase
(2) 	decrease
(3) 	stay the same
9.3 	If an ‘‘inner-loop’’ rate feedback is added to a pitch attitude hold auto-
pilot, you should select an inner-loop, short-period damping ratio that is
than that desired for the outer loop.
(1) 	larger
(2) 	smaller
(3) 	the same
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	469

-- 485 of 650 --

9.4 	For the following OLTF, select the forward path compensator that will
shift the vertical branches of the root locus to the left.
OLTF ¼ 10K
ðs þ 1Þðs þ 2Þ
(1) 0:1ðs þ 30Þ
s þ 3
(2) 0:5ðs þ 1Þ
s þ 0:5
(3) 10ðs þ 3Þ
s þ 30
(4) 4ðs þ 2Þ
s þ 0:5
9.5 	After selecting a gain for the outer loop of our pitch attitude hold auto-
pilot, what did we do to improve the time response characteristics? Which
prefilter compensator would solve a similar problem for the following
CLTF?
CLTF ¼ 25ðs þ 4Þðs þ 0:05Þ
ðs þ 0:01Þðs þ 5Þðs þ 30Þ
(1) 0:8ðs þ 5Þ
s þ 4
(2) 400ðs þ 0:01Þ
s þ 4
(3) 100ðs þ 5Þ
s þ 0:05
(4) 5ðs þ 0:01Þ
s þ 0:05
9.6 	Which of the following is an example of a lag filter?
(1) ðs þ 1Þ
5ðs þ 0:2Þ
(2) s þ 0:05
s þ 0:005
470 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 486 of 650 --

(3) ðs þ 1Þ
10ðs þ 10Þ
(4) 	None of these
9.7 	For a yaw damper system, you want to select a washout circuit time
constant that is really fast to eliminate any pilot inputs from interfering
with system operation.
(1) 	True
(2) 	False
9.8 	We are trying to increase the natural frequency of the short-period mode.
All but which of the following should do this?
(1) 	pitch attitude feedback
(2) 	pitch rate feedback
(3) 	angle of attack feedback
(4) 	load factor feedback
For the short period mode, what parameter would you feedback to
increase damping Ratio? To increase oN ?
9.9 	What effect does b feedback have on
(a) 	Nb?
(b) 	roll mode?
(c) 	spiral mode?
(d) 	dutch roll damping?
9.10 Why are an inner and an outer loop needed for a pitch attitude hold
system?
9.11 Given the following unstable high a case, find the closed-loop impulse
response for a Krg ¼ 0:3 and K1G ¼ 1:75. Show the inner-loop and outer-
root locus. Is the response stable?
AIRCRAFT STABILITY AND CONTROL AUGMENTATION 	471

-- 487 of 650 --

This page intentionally left blank

-- 488 of 650 --

10
Special Topics
This chapter will discuss special topics that amplify and add depth to the
material covered in Chapters 7–9. This material primarily focuses on additional
analysis techniques for feedback control systems and various
types of aircraft flight control systems.
10.1 	System Type and Steady-State Error
When analyzing a unity feedback system such as the one shown in Fig.
10.1, one can deduce much about the system from the number of ‘‘free integra-
tors’’ in the denominator of the forward-path transfer function ½GðsÞ. The
number of free integrators, or free s terms, in the denominator of GðsÞ deter-
mines the system type.
GðsÞ can be expressed in general terms as shown in Eq. (10.1). The value
of n in the free s term defines the system type, where n ¼ 0; 1; 2; . . . :
GðsÞ ¼ K nðt1s þ 1Þðt2s þ 1Þ   
s nðta s þ 1Þðtb s þ 1Þ    ð10:1Þ
The system type has a direct impact on the steady-state error of a system.
Consider the following development for analyzing the error signal EðsÞ in Fig.
10.1.
EðsÞ ¼ RðsÞ ¼ CðsÞ
where RðsÞ is the input and CðsÞ is the output. Next, relate the output to the
error signal.
CðsÞ ¼ EðsÞGðsÞ
473
Fig. 10.1 	Unity feedback system.

-- 489 of 650 --

Substituting CðsÞ into the previous equation yields
EðsÞ ¼ RðsÞ  EðsÞGðsÞ
Simplifying,
EðsÞ½1 þ GðsÞ ¼ RðsÞ
Finally, the transfer function for the error signal to the input becomes
EðsÞ
RðsÞ ¼ 1
1 þ GðsÞ
Multiplying both sides by the input yields an expression for the error signal, as
shown in Eq. (10.2).
EðsÞ ¼ RðsÞ
1 þ GðsÞ ð10:2Þ
Evaluating the steady-state error involves use of the final value theorem,
presented in Sec. 7.3.1.6. When applied to steady-state error, Eq. (10.3) results.
eðtÞss ¼ lim
s!0 sEðsÞ ¼ lim
s!0 s RðsÞ
1 þ GðsÞ
 	
ð10:3Þ
The three most common types of inputs ½RðsÞ are step, ramp, and parabolic.
Each will be analyzed in the following sections for Type 0, Type 1, and Type 2
systems so that the effect of system type on steady-state error can be clearly
seen.
10.1.1 	Step Input
The concept of a step input was first introduced in Sec. 7.3.1.2. In this case,
the step input magnitude is represented by the magnitude R as shown in Fig.
10.2. A physical approximation of a step input occurs when the pilot quickly
moves the stick from the neutral position to another position.
Fig. 10.2 	Step input of magnitude R.
474 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 490 of 650 --

The time domain representation is yðtÞ ¼ R*dðtÞ, where yðtÞ is the output
and dðtÞ is the delta function defined in Sec. 7.3.1.2. The Laplace transform of
a step input with a magnitude of R is
RðsÞ ¼ R
s
Applying this input to Eq. (10.3) results in a steady-state error equation for
step inputs as shown in the following equation:
eðtÞss ¼ lim
s!0 s R
1 þ GðsÞ
 	 1
s
 	
which simplifies to Eq. (10.4)
eðtÞss ¼ R
1 þ lim
s!0 GðsÞ ð10:4Þ
This leads to the definition of the position error constant, Kp. It is related
to the steady-state error between the input and output when the input is a step
function, and provides a means to compare system types. Equation (10.5)
presents the mathematical definition for K p.
K p ¼ lim
s!0 GðsÞ 	ð10:5Þ
Combining Eqs. (10.4) and (10.5) yields a compact notation for steady-state
error for a step input.
eðtÞss ¼ R
1 þ Kp
ð10:6Þ
This formulation applies regardless of system type. The system type affects Kp,
which in turm affects the steady-state error. The specific system types and how
they affect K p and the steady-state error for a step input will be addressed
next.
10.1.1.1 	Type 0 system. 	A Type 0 (n ¼ 0) system has no free integra-
tors, and may be represented by the following transfer function:
GðsÞ ¼ K0ðt1s þ 1Þðt2s þ 1Þ   
ðta s þ 1Þðtb s þ 1Þ   
Placing GðsÞ into Eq. (10.5) yields
Kp ¼ lim
s!0
K0ðt1s þ 1Þðt2s þ 1Þ   
ðta s þ 1Þðtb s þ 1Þ   
 	
¼ K0 	ð10:7Þ
SPECIAL TOPICS 	475

-- 491 of 650 --

It is important to realize that the GðsÞ transfer function must be put in the
previous form to discern the K0 gain by inspection. A common mistake is to
use the gain with roots in the form of (s þ root). In that case, the transfer func-
tion is of the form
GðsÞ ¼ K newðs þ z1Þðs þ z2Þ   
ðs þ p1Þðs þ p2Þ   
which results in a different value for K p.
Kp ¼ Knewðz1Þðz2Þ
ð p1Þð p2Þ
Thus, the form of the transfer function affects the gain that appears in the
numerator. It is important to note that the steady-state error will be the same
regardless of the form of the transfer function. However, the gain K0 will be
different. The end result is that the steady-state error for a Type 0 system with
a step input is a constant, as shown in Eq. (10.8).
eðtÞss ¼ R
1 þ Kp
¼ R
1 þ K0
ð10:8Þ
Inspection reveals that higher values of K0 result in lower values of steady-
state error. The input can be compared to the actual closed unity feedback
output presented in Chapter 8, Eq. (8.11). It is repeated here for convenience.
CðsÞ
RðsÞ ¼ GðsÞ
1 þ GðsÞ
This concept is best reinforced with an example.
Example 10.1
Find the steady-state error for the transfer function GðsÞ with unity feedback
when given a unit step input RðsÞ ¼ 1=sÞ.
GðsÞ ¼ 2
ðs þ 3Þ ¼ 0:667
ð0:333s þ 1Þ
GðsÞ is a Type 0 system because it has no free integrators, so a constant
steady-state error is expected for a step input.
Kp ¼ lim
s!0
0:667
ð0:333s þ 1Þ
 	
¼ 0:667
476 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 492 of 650 --

As expected, K p is equal to K0 . Therefore, the steady-state error is
eðtÞss ¼ R
1 þ K0
¼ 1
1 þ 0:667 ¼ 0:6
Figure 10.3 shows graphically the physical significance of the steady-state
error for unity feedback using the GðsÞ transfer function.
10.1.1.2 	Type 1 system. 	A Type 1 (n ¼ 1) system has one free inte-
grator, so the value for Kp will be infinity, as the following equation shows:
K p ¼ lim
s!0
K1ðt1s þ 1Þðt2s þ 1Þ   
sðta s þ 1Þðtb s þ 1Þ   
 	
¼ 1
eðtÞss ¼ R
1 þ K p
¼ R
1 þ 1 ¼ 0
ð10:9Þ
Thus, the steady-state error is zero and the output will match the input.
Fig. 10.3 	Type 0 system response to a unit step input (unity feedback).
SPECIAL TOPICS 	477

-- 493 of 650 --

Example 10.2
Find the steady-state error for the transfer function GðsÞ with unity feedback
when given a unit step input ½ðRðsÞ ¼ 1=s.
GðsÞ ¼ 2
sðs þ 3Þ ¼ 0:667
sð0:333s þ 1Þ
GðsÞ is a Type 1 system because it has one free integrator; therefore, zero
steady-state error is expected for a step input.
Kp ¼ lim
s!0
0:667
sð0:333s þ 1Þ
 	
¼ 1
As expected, K p is equal to infinity. Therefore, the steady-state error is
eðtÞss ¼ R
1 þ Kp
¼ 1
1 þ 1 ¼ 0
Figure 10.4 shows graphically the physical significance of zero steady-state
error for unity feedback using the GðsÞ transfer function.
Fig. 10.4 	Type 1 system response to a unit step input (unity feedback).
478 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 494 of 650 --

10.1.1.3 	Type 2 system. 	A Type 2 (n ¼ 2) system has two free inte-
grators; therefore K p will be infinity, as is the case with a Type 1 system for a step
input.
K p ¼ lim
s!0
K2ðt1s þ 1Þðt2s þ 1Þ   
s2ðta s þ 1Þðtb s þ 1Þ   
 	
¼ 1 	ð10:10Þ
Thus, the steady-state error is
eðtÞss ¼ R
1 þ Kp
¼ R
1 þ 1 ¼ 0
10.1.1.4 	Step input summary. 	Table 10.1 summarizes the steady-state
error relationship to system type for a step input. Simply stated, if zero steady-
state error is desired for a unity feedback system that is given a step input, then
the system type must be Type 1 or greater. Zero steady-state error is also implied
when K p is equal to infinity.
10.1.2 	Ramp Input
A ramp input is shown in Fig. 10.5. A physical example of a ramp input
occurs when the pilot gradually moves the stick from the center position to
another position in a uniform manner. In this simple example, the magnitude R
is the slope of the ramp that begins at t ¼ 0 s.
Table 10.1 	Steady-state error
summary for a step input
Type 	K p 	eðtÞss
0 	K 0 	R=ð1 þ K 0Þ
1 	1 	0
2 	1 	0
Fig. 10.5 	Ramp input of magnitude R.
SPECIAL TOPICS 	479

-- 495 of 650 --

The time domain representation of the ramp input is yðtÞ ¼ Rt, where yðtÞ is
the output and t is time. The Laplace transform of a ramp input with magni-
tude (slope) R is
RðsÞ ¼ R
s2
Applying this input to Eq. (10.3) results in a steady-state error equation for
ramp inputs as shown in the following form:
eðtÞss ¼ lim
s!0 s R
1 þ GðsÞ
 	 1
s2
 	
which simplifies to
eðtÞss ¼ lim
s!0
R
½s þ sGðsÞ
 	
and finally to Eq. (10.11).
eðtÞss ¼ R
lim
s!0 sGðsÞ ð10:11Þ
This allows the definition of the velocity error constant, Kvv which is
always associated with a ramp input. The mathematical definition of Kv is
shown in Eq. (10.12).
Kv ¼ lim
s!0 sGðsÞ 	ð10:12Þ
This leads to a concise definition of the steady-state error for a ramp input,
independent of system type. It is common for students to confuse the mathe-
matical definition of Kv and the final value theorem described in Sec. 7.3.1.6.
In fact, the right-hand side of both equations are exactly the same. What is
different is the context of the equations. The final value theorem applies to
finding the final value for any stable system. The Kv equation applies to find-
ing the velocity error constant for a system when given a ramp input. Combin-
ing Eqs. (10.11) and (10.12) yields
eðtÞss ¼ R
Kv
ð10:13Þ
As in the case of the step input, this equation applies to all system types for
a ramp input. Application of this equation to three different system types
follows.
480 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 496 of 650 --

10.1.2.1 	Type 0 system. 	From Eq. (10.12), the velocity error coefficient
for a Type 0 system (no free integrators) is
Kv ¼ lim
s!0 s K0ðt1s þ 1Þðt2s þ 1Þ   
ðta s þ 1Þðtb s þ 1Þ   
 	
¼ 0 	ð10:14Þ
This results in a steady-state error of
eðtÞss ¼ R
Kv
¼ R
0 ¼ 1 	ð10:15Þ
Simply stated, a Type 0 system cannot track a ramp input. Example 10.3 illus-
trates this case.
Example 10.3
What is the steady-state error for the transfer function GðsÞ with unity feed-
back when given a unit ramp input ½RðsÞ ¼ 1=s2?
GðsÞ ¼ 2
ðs þ 3Þ ¼ 0:667
ð0:333s þ 1Þ
GðsÞ is a Type 0 function; therefore, an infinite steady-state error is expected
for a ramp input.
Kv ¼ lim
s!0 sGðsÞ ¼ lim
s!0 s 2
ðs þ 3Þ
 	
¼ 0
Therefore, the steady-state error is
eðtÞss ¼ 1
0 ¼ 1
Figure 10.6 shows the time response for a unit ramp input to this system. It
is easy to see from the response that the error approaches infinity as time
increases.
10.1.2.2 	Type 1 system. 	A Type 1 system has one free integrator;
therefore, the steady-state error is a constant. In fact, the steady-state error is
directly related to the gain of a Type 1 system, K1 . This is shown in Eq. (10.16).
Kv ¼ lim
s!0 s K1ðt1s þ 1Þðt2s þ 1Þ   
sðta s þ 1Þðtb s þ 1Þ   
 	
¼ K1 	ð10:16Þ
SPECIAL TOPICS 	481

-- 497 of 650 --

Thus, the steady-state error is a constant.
eðtÞss ¼ R
Kv
¼ R
K1
ð10:17Þ
Example 10.4 illustrates this graphically.
Example 10.4
What is the steady-state error for the transfer function GðsÞ with unity feed-
back when given a unit ramp input ½RðsÞ ¼ 1=s2?
GðsÞ ¼ 2
sðs þ 3Þ ¼ 0:667
sð0:333s þ 1Þ
GðsÞ is a Type 1 system because it has one free integrator; therefore, a constant
steady-state error is expected for a ramp input.
Kv ¼ lim
s!0 s 2
sðs þ 3Þ
 	
¼ 0:667
Fig. 10.6 	Type 0 system response to a ramp input (unity feedback).
482 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 498 of 650 --

For a unit ramp input, the steady-state error is
eðtÞss ¼ R
Kv
¼ 1
0:667 ¼ 1:5
Figure 10.7 shows the time response of GðsÞ to a unit ramp input. Clearly,
the time response produces a constant steady-state error.
10.1.2.3 	Type 2 system. 	A Type 2 system has two free integrators;
therefore zero steady-state error is expected.
Kv ¼ lim
s!0 s K2ðt1s þ 1Þðt2s þ 1Þ   
s2ðta s þ 1Þðtb s þ 1Þ   
 	
¼ 1 	ð10:18Þ
Thus, the steady-state error is
eðtÞss ¼ R
Kv
¼ R
1 ¼ 0
Fig. 10.7 	Type 1 system response to a unit ramp input (unity feedback).
SPECIAL TOPICS 	483

-- 499 of 650 --

Example 10.5 illustrates zero steady-state error for a ramp input and a Type 2
system with unity feedback.
Example 10.5
What is the steady-state error for the transfer function GðsÞ with unity feed-
back when given a unit ramp input ½RðsÞ ¼ 1=s2?
GðsÞ ¼ 2ðs þ 2Þ
s2ðs þ 3Þ ¼ 1:333ð0:5s þ 1Þ
s2ð0:333s þ 1Þ
Because GðsÞ is a Type 2 system, a zero steady-state error is expected for a
ramp input.
Kv ¼ lim
s!0 s 2ðs þ 2Þ
s2ðs þ 3Þ
 	
¼ 1
Thus, the steady-state error is
eðtÞss ¼ 1
1 ¼ 0
Fig. 10.8 	Type 2 system response to a ramp input (unity feedback).
484 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 500 of 650 --

Figure 10.8 illustrates the response of a Type 2 system to a ramp input.
Notice that there is zero steady-state error.
10.1.2.4 	Ramp input summary. 	Table 10.2 summarizes the steady-state
error relationships for each system type. For a ramp input, the Type 0 system will
produce infinite steady-state error, a Type 1 system will produce a finite constant
steady-state error, and the Type 2 system will produce no steady-state error.
10.1.3 	Parabolic Input
The final type of input considered is a parabolic input. Figure 10.9 shows a
drawing of a parabolic input. A physical example of a parabolic input occurs
when the pilot moves the stick away from the center slowly at first, and then
gradually increases the rate of the stick movement.
The time domain representation of a parabola is yðtÞ ¼ t2 . When including
the scale factor R, the relation becomes yðtÞ ¼ Rt2 . The Laplace transform for
a parabola with a magnitude R is
RðsÞ ¼ R
s3
Applying this input to Eq. (10.3) results in a steady-state error equation for
parabolic inputs shown by the following equations:
eðtÞss ¼ lim
s!0 s R
1 þ GðsÞ
 	 1
s3
 	
which simplifies to
eðtÞss ¼ lim
s!0
R
½s2 þ s2GðsÞ
 	
Table 10.2 	Steady-state error summary
for a ramp input
Type 	Kv 	eðtÞss
0 	0 	1
1 	K1 	R=K1
2 	1 	0
Fig. 10.9 	Parabolic input of magnitude R.
SPECIAL TOPICS 	485

-- 501 of 650 --

and finally to Eq. (10.19).
eðtÞss ¼ R
lim
s!0 s2GðsÞ ð10:19Þ
This allows the definition of the acceleration error constant, K a. It allows
a compact notation for steady-state error for a parabolic input. It also provide
a means to compare system types.
Ka ¼ lim
s!0 s2GðsÞ 	ð10:20Þ
which leads to
eðtÞss ¼ R
K a
ð10:21Þ
The steady-state error for all three system types for a parabolic input will be
presented next.
10.1.3.1 	Type 0 system. 	The Ka for a Type 0 system is calculated using
Eq. (10.22).
Ka ¼ lim
s!0 s2 K0ðt2s þ 1Þðt2s þ 1Þ   
ðta s þ 1Þðtb s þ 1Þ   
 	
¼ 0 	ð10:22Þ
Thus, the steady-state error is
eðtÞss ¼ R
K a
¼ 1
This means that a Type 0 system is not capable of tracking a parabolic input.
10.1.3.2 	Type 1 system. 	The K a for a Type 1 system is shown in Eq.
(10.23).
K a ¼ lim
s!0 s2 K1ðt1s þ 1Þðt2s þ 1Þ   
sðta s þ 1Þðtb s þ 1Þ   
 	
¼ 0 	ð10:23Þ
Thus, the steady-state error is
eðtÞss ¼ R
K a
¼ 1
This means that a Type 1 system is also unable to track a parabolic input.
Example 10.6 shows this error for a parabolic input to a Type 1 system.
486 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 502 of 650 --

Example 10.6
What is the steady-state error for the transfer function GðsÞ with unity feed-
back when given a unit parabolic input ½RðsÞ ¼ 1=s3?
GðsÞ ¼ 2
sðs þ 3Þ ¼ 0:667
sð0:333s þ 1Þ
Because this is a Type 1 system with a parabolic input, infinite steady-state
error is expected.
Ka ¼ lim
s!0 s2 	2
sðs þ 3Þ
 	
¼ 0
Thus, the steady-state error is
eðtÞss ¼ 1
0 ¼ 1
The resulting time response shown in Fig. 10.10 displays the increasing
steady-state error as time increases.
10.1.3.3 	Type 2 system. 	Finally, the K a for a Type 2 system given a
parabolic input is shown in Eq. (10.24).
Ka ¼ lim
s!0 s2 K2ðt1s þ 1Þðt2s þ 1Þ   
s2ðta s þ 1Þðtb s þ 1Þ   
 	
¼ K2 	ð10:24Þ
Thus
eðtÞss ¼ R
K a
¼ R
K2
When the unity feedback is applied, the Type 2 system will track a parabolic
input with a constant steady-state error. This is shown in Example 10.7.
Example 10.7
What is the steady-state error for the transfer function GðsÞ with unity feed-
back when given a unit parabolic input ½RðsÞ ¼ 1=s3?
GðsÞ ¼ 2ðs þ 2Þ
s2ðs þ 3Þ ¼ 1:333ð0:5s þ 1Þ
s2ð0:333s þ 1Þ
SPECIAL TOPICS 	487

-- 503 of 650 --

Because GðsÞ is a Type 2 system, a constant steady-state error is expected for
a ramp input.
Ka ¼ lim
s!0 s2 2ðs þ 2Þ
s2ðs þ 3Þ
 	
¼ 1:333
Thus, the steady-state error is
eðtÞss ¼ 1
1:333 ¼ 0:75
Figure 10.11 illustrates the response of a Type 2 system to a parabolic
input. Notice that there is a finite steady-state error of 0.75.
10.1.3.4 	Parabolic input summary. 	Table 10.3 summarizes the steady-
state error relationship for a parabolic input. Type 0 and Type 1 systems cannot
track a parabolic input; while a Type 2 system can track a parabolic input with a
constant steady-state error.
Fig. 10.10 	Type 1 system response to a parabolic input (unity feedback).
488 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 504 of 650 --

10.1.4 	Overall Steady-State Error Summary
Table 10.4 summarizes the overall steady-state error for Type 0, Type 1, and
Type 2 systems for step, ramp, and parabolic inputs. Notice that as the system
type increases, the steady-state error performance increases (steady-state error
decreases) for the same type of input. This table only applies for the case of
stable unity feedback systems.
Fig. 10.11 	Type 2 system response to a parabolic input.
Table 10.3 	Steady-state error
summary for a parabolic input
Type 	Ka 	eðtÞss
0 	0 	1
1 	0 	1
2 	K2 	R=K2
SPECIAL TOPICS 	489

-- 505 of 650 --

10.1.5 	Error Constants for Stable Nonunity Feedback Systems
It is possible to assess error constants for stable nonunity feedback systems.
Figure 10.12 shows the block diagram of an ideal system represented by a
transfer function T d ðsÞ, and an actual transfer function of CðsÞ=RðsÞ [which is
an approximation of Td ðsÞ].
R is the input to both systems, and E is the difference (error) between the
desired output and the actual output. The three nonunity feedback or general
error constants are defined based on this representation.
The general step error constant Ks is defined as:
Ks  1
lim
s!0 Td ðsÞ  CðsÞ
RðsÞ
 	 	ð10:25Þ
The steady-state error for a general system when the input is a unit step func-
tion is related to K s by
eðtÞss ¼ 1
K s
ð10:26Þ
The general ramp error constant Kr is defined as
K r  1
lim
s!0
1
s T d ðsÞ  CðsÞ
RðsÞ
 	 	ð10:27Þ
Table 10.4 	Steady-state error summary
Error constants 	Steady-state error
System type 	Step 	Ramp 	Parabolic 	Step 	Ramp 	Parabolic
K p ¼ 	Kv ¼ 	K a ¼ 	R=ð1 þ K pÞ 	R=Kv 	R=K a
0 	K0 	0 	0 	R=ð1 þ K0Þ 	1 	1
1 	1 	K1 	0 	0 	R=K1 	1
2 	1 	1 	K2 	0 	0 	R=K2
Fig. 10.12 	Nonunity feedback system representation.
490 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 506 of 650 --

The steady-state error for a general system when the input is a unit ramp func-
tion is related to K r by
eðtÞss ¼ 1
Kr
ð10:28Þ
The general parabolic error constant K pa is defined as
K pa  1
lim
s!0
1
s2 Td ðsÞ  CðsÞ
RðsÞ
 	 	ð10:29Þ
The steady-state error for a general system when the input is a unit parabolic
function is related to K pa by
eðtÞss ¼ 1
K pa
ð10:30Þ
For an aircraft, this becomes a realistic scenario because sensors that
measure parameters have dynamics associated with them. Thus, it may not be
possible to obtain unity feedback. One case of a nonunity feedback system is
presented in Example 10.8.
Example 10.8
For the following nonunity feedback system, find the general error constants
if the desired transfer function is 1
2 :
The first step in solving this problem is to form the CðsÞ=RðsÞ ratio. This is
simply the closed-loop transfer functions with GðsÞ ¼ 2=ðs2 þ 2Þ and HðsÞ ¼
ðs þ 1Þ. The resulting equation is
CðsÞ
RðsÞ ¼ 2
s2 þ 2s þ 4
Next, the difference or error between the actual and desired transfer functions
is formed.
Td ðsÞ  CðsÞ
RðsÞ ¼ 0:5  2
s2 þ 2s þ 4 ¼ sðs þ 2Þ
2ðs2 þ 2s þ 4Þ
SPECIAL TOPICS 	491

-- 507 of 650 --

Therefore
K s ¼ 1
lim
s!0
sðs þ 2Þ
2ðs2 þ 2s þ 4Þ
 	 ¼ 1
Kr ¼ 1
lim
s!0
1
s
sðs þ 2Þ
2ðs2 þ 2s þ 4Þ
 	 ¼ 4
K pa ¼ 1
lim
s!0
1
s2
sðs þ 2Þ
2ðs2 þ 2s þ 4Þ
 	 ¼ 0
10.2 	Frequency Response
Time domain response of a system has already been covered in great detail
in Sec. 8.5. In the time domain, the system response is measured in terms of
such things as rise time and settling time. However, another important aspect
of system performance is the frequency domain. This section explains the
background on frequency response, discusses frequency response curves and
how to construct them, shows frequency domain analysis and specifications,
and ends with several subsections detailing frequency domain compensation. If
logarithmic plots are used, frequency domain analysis is sometimes called
Bode analysis.
10.2.1 	Background
Frequency response analysis is centered on the concept of the sinusoidal
response of a system. When a sine wave is provided as the input to a system,
as shown in Fig. 10.13, the steady-state output will be a sinusoid at the same
frequency but at a different magnitude and phase. Notice that the input ampli-
tude is A1 and the output is some different amplitude, A2 . Also, notice that the
peak amplitude occurs later in time. This time delay is known as ‘‘phase lag’’
in the frequency domain.
Fig. 10.13 	Input=output relationship for a transfer function.
492 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 508 of 650 --

Before proceeding, it is important to relate the time domain to the frequency
domain. The variable s, as described in Secs. 7.2 and 7.3, is a complex variable
of the form:
s ¼ s  iod ¼ zon  iod ¼ a  ib 	ð10:31Þ
where s is the transient part of the response and od is the steady-state part of
the response. The time response can be studied knowing the values of z, on,
and od (see Sec. 8.5). Because the observed frequency is usually the damped
frequency (except in the case of a pure, undamped sinusoid), the frequency (o)
discussed for frequency analysis will be the damped frequency (od ). Also,
note that for frequency analysis the steady-state response is used. Thus, s
simplifies to
s ¼ iod  io 	ð10:32Þ
The frequency response is thus easy to relate to the aircraft transfer func-
tions developed in previous sections. For example, take an actuator transfer
function
GðsÞ ¼ 10
ðs þ 10Þ
This can now be expressed in frequency domain terms as
GðioÞ ¼ 10
ðio þ 10Þ
The same transformation from the s domain to the frequency domain is simply
made by substituting Eq. (10.32) for s into any GðsÞ transfer function.
10.2.1.1 	Input=output relationship. 	To understand the frequency domain
fully, it is best to go back to the roots of the time domain. As mentioned earlier,
the output of a system with a sinusoidal input will have the same frequency as the
input, but at a different amplitude (magnitude) and phase angle. Given the input
rðtÞ ¼ A1 sinðotÞ 	ð10:33Þ
the output will be
cðtÞ ¼ A2 sinðot þ fÞ 	ð10:34Þ
where A1 is the input amplitude, A2 is the output amplitude, and f is the
phase shift angle. The amplitudes are read from the peak values of the input
sinusoid for A1 and the output sinusoid for A2 in the frequency response. It is
also quite easy to find the phase lag from a frequency response. Because the
input and output sinusoids have the same frequency, from the basic definition
of frequency response, they have the same period. As stated earlier, the time
SPECIAL TOPICS 	493

-- 509 of 650 --

domain equivalent of phase lag is time delay, which is easily obtained from a
frequency domain plot. The time delay between the peak of the input and
output is the phase lag. Because one period contains 360 deg, the phase lag
can be obtained from the following ratio:
tdel ðsÞ
TðsÞ ¼ fðdegÞ
360ðdegÞ ð10:35Þ
where tdel is the delay between the input and output peak amplitudes (in
seconds), T is the period of oscillation (in seconds), and f is the phase lag (in
degrees). Figure 10.14 shows the input=output relationship for a sinusoidal
input to a typical transfer function.
Using the Type 0 transfer function from the previous section ½GðsÞ ¼
2=ðs þ 3Þ and an input of rðtÞ ¼ 1 sinð4tÞ results in an output amplitude of 0.4
and a phase shift f of approximately 53 deg. In this case, the period
T ¼ 2p=o ¼ 2p=4 ¼ 1:57 sec, and the delay is approximately 0.23 sec. Thus
f ¼ 360 deg 0:23 s
1:57 s ¼ 53 deg
Fig. 10.14 	Sinusoidal input=output relationship.
494 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 510 of 650 --

This can be related to Eq. (10.34) because o ¼ 4 rad=s, the output amplitude
A2 ¼ 0:4, and the phase angle f is 53 deg. Thus, cðtÞ ¼ 0:4 sinð4t þ 53 degÞ is
the resulting output sinusoid.
Frequency response analysis simply relates the output to the input by exam-
ining the variation of a sinusoid between the entry and exit to a system. To
fully characterize a system, a sine sweep feeds sinusoids of varying frequencies
into a system and then measures the output. More about this will be discussed
in the experimental frequency response section. It should be noted that at times
the transient dynamics are important. The disadvantage of frequency analysis is
the lack of transient response characteristics that may be needed for time
domain specifications.
10.2.1.2 	Transient analysis. 	To understand why the transient part is not
used in frequency analysis, consider that a sinusoid is a continuous input. Thus,
any initial transients are not major contributors to the overall response. Consider a
sinusoidal input of rðtÞ ¼ sinð4tÞ into the following transfer function:
GðsÞ ¼ 4
s2 þ 2s þ 4
Figure 10.15 shows the transient portion associated with the output. Notice the
variation in the amplitude for the first three cycles of the output. This is the
transient response. All cycles after that are the same amplitude, and the
response has thus reached steady-state. For a sinusoidal input, which is the
basis of frequency analysis, the majority of the cycles are associated with
steady-state. Thus, it should be apparent from Fig. 10.15 that ignoring the tran-
sient portion of the response makes sense for frequency analysis.
10.2.1.3 	Aircraft application. 	Why is frequency analysis important to
aircraft applications? The pilot input can actually be thought of as sinusoidal stick
movement as the pilot makes corrections to keep the aircraft at a specified trim
condition. The pilot can move the stick forward and back slowly in calm flight
conditions, but may have to move the stick rapidly forward and back to account
for turbulence. If the pilot is trying to maintain a pitch angle, then the aircraft
response is an output sinusoid in terms of nose position, for example. The input is
the pilot’s stick input, and the aircraft dynamics are the transfer function through
which the sinusoid is applied.
10.2.2 	Frequency Response Curves
To perform analysis in the frequency domain, it is most convenient to plot
the magnitude and phase of the output vs frequency. At any individual
frequency, there is a relationship between the input and output similar to Fig.
10.14. As the frequency is varied, the relationship between the input and
output amplitude and phase varies. The ratio between the input and output
forms the magnitude plot, and the variation of phase angle (f) is plotted as the
phase plot.
SPECIAL TOPICS 	495

-- 511 of 650 --

Because the frequency response curves possess both a magnitude and angle,
it is often easier to express the quantities in phasor form. Given a generic
complex number zz
zz ¼ Re þ iIm 	ð10:36Þ
The phasor form of a complex number zz is shown in Eq. (10.37)
jzzj < f 	ð10:37Þ
where the magnitude jzj is written as
jzzj ¼
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ðRe 2 þ Im2Þ
q
ð10:38Þ
and the phase angle f is written as
fff ¼ tan1 Im
Re
 	
ð10:39Þ
Fig. 10.15 	Transient associated with sinusoidal input.
496 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 512 of 650 --

Thus, the complex notation for a transfer function G	GðioÞ, written in terms of
the magnitude jGðioÞj and the phase angle f, is
G	GðioÞ ¼ jGðioÞfff 	ð10:40Þ
This means that at a particular frequency o, the transfer function becomes one
complex number. As the frequency varies, the value of the complex number
varies. The compilation of all of these complex numbers for different frequen-
cies becomes the frequency response for the transfer function.
Example 10.9
To illustrate frequency response plots, a typical transfer function G	GðioÞ is
defined as
G	GðioÞ ¼ 2
ðio þ 3Þ
The frequency response for G	GðioÞ is shown in Fig. 10.16 as the magnitude vs
frequency plot and in Fig. 10.17 as the phase vs frequency plot. Note that
frequency response plots involve both magnitude and phase plots vs frequency.
Notice that one frequency point for this plot is shown in Fig. 10.14. Exam-
ining the response at 4 rad=s yielded an amplitude ratio of 0.4 and phase lag
of 53 deg. This can be seen as a single point on the magnitude and frequency
plots that follow. The rest of the plot is generated identically using different
frequencies.
10.2.3 	Bode Plots
The most common method to display frequency response plots is on a loga-
rithmic scale. This allows presentation and simplifies the analysis of a large
range of frequencies in a compact plot. In addition, notice that in the case of
Figs. 10.16 and 10.17 most of the change occurs at low frequency. The loga-
rithmic scale allows expanded display of the lower frequencies. Another advan-
tage is that when logarithms are used, multiplications and divisions become
simple additions and subtractions. Finally, using plots of this type allows for
graphical analysis of transfer functions. This type of logarithmic frequency plot
is called a Bode plot. The name is in honor of H.W. Bode, who used them for
the study of feedback amplifiers.
Before proceeding, it is necessary to define a logarithm mathematically as it
pertains to Bode plots. This is best illustrated by first putting Eq. (10.40) into
exponential form.
G	GðioÞ ¼ jGðioÞje ifðoÞ 	ð10:41Þ
SPECIAL TOPICS 	497

-- 513 of 650 --

Taking the logarithm of both sides results in
log G	GðioÞ ¼ log jGðioÞj þ log e ifðoÞ ¼ log jGðioÞj
|fflfflfflfflfflfflffl{zfflfflfflfflfflfflffl}
Magnitude
þ i0:434fðoÞ
|fflfflfflfflfflfflffl{zfflfflfflfflfflfflffl}
Phase
The real part is the logarithm of the magnitude and the imaginary part is a
scale factor of 0.434 times the phase angle in radians. It is standard procedure
when discussing Bode plots to omit the 0.434 scale factor and use only the
angle fðoÞ.
It is also common in feedback control systems to use the decibel scale for
the log magnitude. This allows display of a large range of magnitude numbers
on a graph. The logarithm for the magnitude of a transfer function G	GðioÞ with
units of decibels is represented as
20 log jGðioÞj
with units of dB for decibels. Sometimes this is expressed as the log magni-
tude of G	GðioÞ, or Lm G	GðioÞ for short.
Fig. 10.16 	Frequency response curve—magnitude.
498 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 514 of 650 --

10.2.3.1 	Bode form. 	To properly evaluate transfer functions with Bode
plots, it is convenient to rearrange the equation such that all non-io terms are
equal to one.
G	GðioÞ ¼
K nðioÞmð1 þ it1oÞð1 þ it2oÞð1 þ io
on1
!2
þi 2zo
on1
!
ðioÞnð1 þ it3oÞð1 þ it4oÞð1 þ io
on2
!2
þi 2zo
on2
! 	ð10:42Þ
This is called the Bode form of a transfer function, and the gain Kn is called
the Bode gain.
Example 10.10
Place the following transfer function into Bode form and identify the Bode
gain.
G	GðiwÞ ¼ 4ðio þ 2Þðio þ 5ÞððioÞ2 þ 2io þ 6Þ
ðioÞðio þ 3Þðio þ 7ÞððioÞ2 þ 4io þ 8Þ
Fig. 10.17 	Frequency response curve—phase.
SPECIAL TOPICS 	499

-- 515 of 650 --

To put this transfer function into Bode form, the numerator and denominator
poles=zeros must have the non-io terms (2,5,6 for the numerator and 3,7,8 for
the denominator) factored out so that they have a value of 1.
G	GðioÞ ¼
4ð2Þð5Þð6Þ io
2 þ 1
 	 io
5 þ 1
 	 ðioÞ2
6 þ 2io
6 þ 1
!
ð3Þð7Þð8ÞðioÞ io
3 þ 1
 	 io
7 þ 1
 	 ðioÞ2
8 þ 4io
8 þ 1
!
This simplifies to the Bode form
G	GðioÞ ¼
1:4286 io
2 þ 1
 	 io
5 þ 1
 	 ðioÞ2
6 þ io
3 þ 1
!
ðioÞ io
3 þ 1
 	 io
7 þ 1
 	 ðioÞ2
8 þ io
2 þ 1
!
The gain in Bode form is the Bode gain, which is 1.4286 in this case.
10.2.3.2 	Additive=subtractive nature of Bode plots. 	The power of
Bode plots is their simplicity. Because the Bode plots are based on logarithms,
terms in the transfer function G	GðioÞ, which are multiplied together, may be added
logarithmically. In the same manner, terms in 	G	GðioÞ that are divided are
subtracted logarithmically. In other words, numerator terms (constant and
zeros) are added and denominator terms (poles) are subtracted. This is best
illustrated by an example using the general transfer function of Eq. (10.42).
Taking the log magnitude in decibels results in the following representation for
magnitude.
Remember that with Eq. (10.38) the magnitude of a complex number is
obtained, and that the phase for a complex number is obtained with Eq.
(10.39). At any particular frequency each term is simply a complex number
with magnitude and phase. By using the logarithmic approach, each of these
individual terms are simply added or subtracted to form the overall response.
20 log jGðioÞj ¼ 20 log Kn þ 20m log io þ 20 log j1 þ it1oj þ 20 log j1 þ it2oj
þ 20 log 1  o2
o2
n1
þ i 2zo
on1
 20n log io  20 log j1 þ it3oj  20 log j1 þ it4oj
ð10:43Þ
 20 log 1  o2
o2
n2
þ i 2zo
on2
500 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 516 of 650 --

The phase is represented as
ffGðioÞ ¼ ffKn þ m90 deg þ tan1 ot1 þ tan1 ot2 þ tan1
2zo
on1
1  o2
o2
n2
0
B
B
B
@
1
C
C
C
A
 n90 deg  tan1 ot3  tan1 ot4  tan1
2zo
on2
1  o2
o2
n2
0
B
B
B
@
1
C
C
C
A ð10:44Þ
Each term can be treated as a separate entity. Thus, Bode analysis allows
each contributing pole or zero to be analyzed separately. There are four types
of terms in a transfer function, and therefore in Bode plots.
1) Constant term, Kn
2) Pole or zero at the origin, ðioÞ n (þn for a zero, n for a pole)
3) First-order real pole or zero, ð1 þ iotÞ n
4) Second-order quadratic (complex conjugate) poles or zeros, ð1  o2=o2
n þ
i2zo=onÞn
It is instructive to show an example of how to manually calculate a Bode
plot at a single frequency. The computer iteratively performs these calculations
for different frequencies to form the Bode plot. Therefore, understanding how
to perform the calculation for a single frequency allows understanding of how
the entire Bode plot is calculated.
Example 10.11
Given the following transfer function G	GðsÞ, calculate the log magnitude and
phase at a frequency o ¼ 10 rad=s.
G	GðsÞ ¼ 5ðs þ 2Þðs2 þ 2s þ 4Þ
sðs þ 3Þðs2 þ 4s þ 6Þ
The first step is to transform G	GðsÞ into G	GðioÞ by substituting s ¼ io. Next,
put the resulting transfer function into Bode form.
GðioÞ ¼
5ð2Þð4Þ io
2 þ 1
 	 ðioÞ2
4 þ 2io
4 þ 1
!
3ð6Þðio io
3 þ 1
 	 ðioÞ2
6 þ 4io
6 þ 1
!
SPECIAL TOPICS 	501

-- 517 of 650 --

which simplifies to a Bode form
GðioÞ ¼
2:22 io
2 þ 1
 	
1  o2
4 þ io
2
 	
ðioÞ io
3 þ 1
 	
1  o2
6 þ i2o
3
 	
After the transfer function is in Bode form, it is easy to calculate the log
magnitude.
20 log jGði10Þj ¼ 20 log 2:22 þ 20 log j1 þ ið10Þ=2j þ 20 log 1  10 2
4 þ ið10Þ=2
 20 log ji10j  20 log j1 þ ið10Þ=3j  20 log 1  10 2
6 þ i 2ð10Þ
4
Simplifying,
20 log jGði10Þj ¼ 6:93 þ 14:15 þ 27:79  20  10:82  24:62 ¼ 6:57 dB
Similarly, for the phase:
fð10Þ ¼ 0 deg þ tan1 10
2 þ tan1
10
2
1  10 2
4
 90 deg  tan1 10
3  tan1
2ð10Þ
3
1  10 2
6
This simplifies to
fð10Þ ¼ 0 deg þ 78:76 deg þ 168:23 deg  90 deg  73:31 deg  156:94 deg
¼ 73:42 deg
Figure 10.18 shows the excellent correlation between the Bode plot at
o ¼ 10 rad=s and the previous calculations. It is the accumulation of the log
magnitude and phase calculations that produce the Bode plot, after all. Thus,
there should be a one-to-one correlation at each frequency point calculated.
10.2.3.3 	Bode plot construction. 	With the advent of computers and
engineering software, it is very easy to have calculated Bode plots at one’s
fingertips (such as the one shown in Fig. 10.17). This allows an engineer to
quickly analyze multiple transfer functions over a wide range of frequencies.
However, the importance of understanding the basics of Bode plot construction
cannot be overstated. A tremendous amount of insight is gained from recognizing
how the curves in a Bode plot are generated. Ultimately, a Bode plot is the
superposition of all the individual terms (poles, zeros, and gain) in the transfer
function. Each of the four types of terms described in the previous section can be
plotted one by one.
502 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 518 of 650 --

Hand-drawn Bode plots start with straight-line asymptotic approximations.
They are called asymptotic approximations because the actual Bode plots
approach these lines asymptotically. The maximum error for these approxima-
tions occurs at the break point of a pole or zero. A break point is at the
frequency that corresponds to the pole or zero location. For example, the break
point for a pole at (s þ 2) [or 2ðio=2 þ 1Þ in Bode form] occurs at 2 rad=s. For
a second-order (or quadratic) term, the break point is at the natural frequency,
on. Sometimes, the break point is called the corner frequency. The following
sections will describe how to draw the asymptotic approximations for the four
different types of terms in a Bode plot.
10.2.3.4 	Constant terms. 	If a transfer function is in Bode form, then the
constant present is the Bode gain. As expected, the magnitude and phase
contributions to a Bode plot from a constant are constants. The gain contribution
is exact, and thus not an approximation. Stated another way, the asymptotic
approximation for a constant equals the actual Bode plot contribution. The
magnitude contribution from a constant Kn is simply:
20 log jKnj ¼ const 	ð10:45Þ
Fig. 10.18 	Bode plot for Example 10.11 with v ¼ 10 rad=s marked.
SPECIAL TOPICS 	503

-- 519 of 650 --

The phase depends strictly on the sign.
þKn ¼ 0 deg
or
Kn ¼ þ= 180 deg 	ð10:46Þ
Figure 10.19 shows the Bode plot contribution for both K n ¼ 10 and
Kn ¼ 10. Notice that the magnitude plot is the same for both, but the phase
is different.
10.2.3.5 	Poles or zeros at origin. 	The second type of term in a Bode
plot is a pole or zero at the origin. If there is a pole at the origin, this is called an
integrator (recall the discussion on system type in Sec. 10.1). A zero at the origin
is called a differentiator. These terms are represented mathematically by
sn ¼ ðioÞ n
where n is the number of terms present. Poles correspond to n while zeros
correspond to þn.
All first-order terms have a slope of either positive or negative 20 dB=
decade. A decade is a factor of 10 change in frequency. For example, going
from o ¼ 1 to o ¼ 10 or from o ¼ 10 to o ¼ 100 is a decade change in
frequency. First-order poles have a 20 dB=decade slope, and first-order zeros
Fig. 10.19 	Bode plot for positive and negative constant K n ¼ 10.
504 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 520 of 650 --

have þ20 dB=decade slope. The value of þ= 20 dB=decade is because of the
fact that an order of 10 increase (or decrease) in magnitude (o in this case)
corresponds to an increase (or decrease) of 20 dB, as seen in Eq. (10.47). Poles
and zeros at the origin are simply a special case of first-order poles and zeros.
Because there is no break point for these terms, the asymptotic approximation
is also the exact Bode plot contribution. The magnitude is represented by the
following equation:
20 log jioj n ¼ 20ðnÞ log jioj 	ð10:47Þ
An interesting magnitude characteristic of poles and zeros at the origin is that
they have a value of 1, or 0 dB, at o ¼ 1 rad=s. Thus, all terms at the origin
cross through 0 dB on the Bode plot at o ¼ 1 rad=s.
The general equation for slope for terms that pass through the origin is:
slope ¼ 20ðnÞdB=decade 	ð10:48Þ
Thus, if two integrators are present, they would be drawn as a line with a
slope of 40 db=decade, which crosses the 0 dB line at 1 rad=s.
The second aspect of the Bode plot asymptotic approximation is phase. All
first-order terms add either þ90 deg of phase (for a zero) or 90 deg of phase
(for a pole). Here, too, terms that pass through the origin possess an interesting
characteristic. They provide all of their phase contribution immediately. Thus,
they provide a constant phase regardless of frequency. Mathematically, this is
represented as
phase ¼ 90ðnÞ 	ð10:49Þ
This can be seen from examination of the complex plane. For Bode analysis,
s ¼ io has already been defined. Figure 10.20 shows that s is essentially a
vector along the imaginary axis of magnitude o and phase 90 deg.
Thus, a for a numerator s term, s ¼ jojff 90 deg. For a denominator s term,
or 1=s,
1
s ¼ 1
jojff 90 deg ¼ ff 90 deg
joj
Figure 10.21 shows cases for both one and two poles at the origin as well as
one and two zeros at the origin. Note that there is change in slope and phase
contribution, but all pass through 0 dB at 1 rad=s.
10.2.3.6 	First-order poles and zeros. 	One of the most common terms
seen in Bode plots are first-order poles and zeros. They correspond to first-order
roots in the numerator or denominator of the transfer functions. These are
sometimes called simple poles and zeros. Here, straight line representations of
the frequency response are approximations. The general form for a first-order
SPECIAL TOPICS 	505

-- 521 of 650 --

term is
s þ 1
t
 	n
) ð1 þ iotÞ n 	ð10:50Þ
As with the previous section, n corresponds to the number of poles or zeros. If
there is one root, then n ¼ 1. Zeros have a þ n power, while poles have a  n
power. The log magnitude for first-order terms is expressed as
20 log j1 þ iotj n ¼ 20ðnÞ log j1 þ iotj 	ð10:51Þ
Each single pole has a magnitude slope of 20 dB=decade, while each single
zero has a contribution of þ20 dB=decade. However, the slope does not occur
until after the corner frequency or break point, oc, which occurs at the nega-
tive value of the root. For example, an (s þ 3) term would have a corner
frequency of 3 rad=s. The reason for the þ= 20 dB=decade slope is the same
Fig. 10.20 	Complex plane representation of s.
Fig. 10.21 	Bode plot and asymptotic sketch for poles=zeros at the origin.
506 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 522 of 650 --

as for the pole or zero at the origin—the magnitude increases primarily
because of o at frequencies well past the break frequency. Therefore, the
magnitude increases by an order of magnitude for every decade change in
frequency. The corner frequency is usually abbreviated oc. The magnitude thus
varies in relation to the corner frequency
For o  oc; Mag ¼ 0 dB and slope ¼ 0 dB=decade
For o  oc; slope ¼ 20ðnÞdB=decade 	ð10:52Þ
If o  oc, then an exact solution is necessary for the term in question (Exam-
ple 10.11).
The asymptotic straight line approximation for a first-order term is quite
simple. Below the corner frequency, the magnitude response is a straight line
along 	the 	0 dB 	line. 	At 	the 	corner 	frequency, 	the 	slope 	becomes
þ= 20ðnÞ dB=decade. Most of the error in the approximation is near the
corner frequency. This is shown in the following log magnitude plot (Fig.
10.22) for the term (1 þ io=2), where the corner frequency is 2 rad=s. The
error at the corner frequency is approximately 3 dB, while the error at an
octave (two times or one half the frequency) is approximately 1 dB. The error
at 2 rad=s is 3 dB and the error at 1 rad=s and 4 rad=s is approximately 1 dB for
a first-order pole or zero.
There is also a straight-line approximation for the phase associated with a
first-order pole or zero. The actual phase is
Angle½1 þ iot n ¼ ðnÞ tan1ðotÞ 	ð10:53Þ
Fig. 10.22 	Bode log magnitude plot—actual vs approximation.
SPECIAL TOPICS 	507

-- 523 of 650 --

The straight-line approximation for phase starts at a decade below the corner
frequency at 0 deg and ends a decade above the corner frequency at
þ= ðnÞ deg. The phase at the corner frequency is þ= ðnÞð45Þ deg. This
approximation is shown graphically in Fig. 10.23 for the first-order pole
previously discussed with a corner frequency of 2 rad=s. This is summarized in
Table 10.5. The poles have a negative phase contribution, and the zeros have a
positive phase contribution.
10.2.3.7 	Second-order complex poles and zeros. 	The last type of
terms in Bode plots are second-order (or quadratic) poles and zeros. These are
terms that are complex conjugate roots and can have much variation from the
straight line asymptotic approximation. The primary accuracy consideration
between the actual frequency response and the approximation is the damping.
Light damping results in large frequency peaks at the resonant or natural
frequency of the roots. The general form for second-order roots is
ðs2 þ 2zon s þ o2
nÞ n ) 	1  o2
o2
n
þ i 2zo
on
 	n
ð10:54Þ
The actual magnitude equation for second-order poles=zeros is
log Magnitude 1  o2
o2
n
þ i 2zo
on
 	n
¼ 20ðnÞ log
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
1  o
on
 	2
" 	#
þ 2z o
on
 		 	2
v
u
u
t
ð10:55Þ
while the actual phase equation is
Angle 1  o2
o2
n
þ i 2zo
on
 	n
¼ ðnÞ tan1
2z o
on
1 
 o
on
2
2
6
6
6
4
3
7
7
7
5 ð10:56Þ
Because there are two poles or zeros associated with second-order roots, the
asymptotic magnitude slope is twice that of first-order poles=zeros. In a similar
manner to first-order poles and zeros, for frequencies below the natural fre-
quency (or corner frequency for first-order terms), the magnitude contribution
is zero. After the natural frequency, the slope becomes þ= ðnÞ40 dB=decade.
For o  on; Magnitude ¼ 0 dB and slope ¼ 0 dB=decade
For o  on; slope ¼ þ=  ðnÞ40 dB=decade 	ð10:57Þ
As with first-order terms, the maximum error occurs around the resonant
frequency, which corresponds to the damped natural frequency. As the damp-
ing decreases, the resonant peak occurs closer to the undamped natural
frequency. For poles with damping greater than approximately 0.5, the actual
508 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 524 of 650 --

Fig. 10.23
 
Bode phase plot—actual vs approximation.
SPECIAL TOPICS 	509

-- 525 of 650 --

response falls below the approximation. For poles with damping below 0.5, the
actual response lies above the approximation. For zeros, the exact opposite is
true. This is shown in Fig. 10.24. Notice that for lightly damped systems, the
approximation is very poor around the natural (or corner) frequency.
The phase approximation of second-order poles=zeros is similar to that of
first-order poles=zeros in the sense that the phase contribution starts one
decade below the natural frequency and ends one decade above. Half of the
phase contribution occurs at the natural frequency. Because there are two poles=
zeros involved, the overall phase contribution is þ= 180 deg instead of
þ= 90 deg. Once again, the most dramatic variation from the approximation
occurs for lightly damped poles=zeros. The phase variation for poles with
varied damping is shown in Fig. 10.25. For second-order zeros, the plot would
be inverted. The approximation for second-order poles=zeros is summarized in
Table 10.6. For poles the phase angle is negative, and for zeros the phase
angle is positive.
Table 10.5 	First-order pole frequency
approximation
o
oc
0.1 	1.0 	10.0
Angle 	0 deg 	 ðnÞ45 deg 	 ðnÞ90 deg
Fig. 10.24 	Log magnitude curve for second-order poles.
510 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 526 of 650 --

Fig. 10.25
 
Phase curve for second-order poles.
SPECIAL TOPICS 	511

-- 527 of 650 --

10.2.3.8 	Bode approximation example. 	It is easiest to understand how
to construct a Bode plot approximation after looking at a complete example. The
easiest way to construct an approximation is to plot each term individually, then
add all the terms together. This is sometimes called superposition.
The procedure is relatively simple:
1) Put the transfer function into Bode form.
2) Draw the asymptotic approximations for each individual term in the
transfer function.
3) Starting at the lowest frequency (left of the plot), add all the magnitudes at
a specific frequency together to get the overall point. For example, if the
Bode gain is 10 dB and an integrator is present, then at o ¼ 0:1 rad=s the
integrator contribution is 20 dB. Therefore, the overall magnitude at
o ¼ 0:1 rad=s is 10 dB  20 dB ¼  10 dB.
Do this for various frequencies, and the overall Bode approximation is
obtained.
Example 10.12
Using the transfer function of Example 10.11, construct an asymptotic
approximation for the Bode plot.
GðioÞ ¼
2:22 io
2 þ 1
 	
1  o2
4 þ io
2
 	
ðioÞ io
3 þ 1
 	
1  o2
6 þ i2o
3
 	
Before constructing the plot, note that the gain is 20 log 2.22 ¼ 6.93 dB. Also,
note the corner frequency for the first-order zero is at 1 rad=s and the natural
frequency for the second-order zero is 2 rad=s. There is a first-order integrator
pole and a first-order pole with a corner frequency of 3 rad=s. Finally, there is
a second-order pole with a natural frequency of 2.45 rad=s. Figure 10.26 shows
the comparison between the actual Bode magnitude plot and the asymptotic
plot. As expected, the plot is very accurate far above and below the corner and
natural frequencies. However, near the corner and natural frequencies is
approximately 5 dB of error. Knowing the damping for the second-order poles=
zero and the corrections for the first-order pole=zero, and accounting for these
Table 10.6 	Second-order pole frequency
approximation
o
oc
0.1 	1.0 	10.0
Angle 	0 deg 	 ðnÞ90 deg 	 ðnÞ180 deg
512 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 528 of 650 --

on the sketch would give much greater accuracy. The magnitude corrections
for the second-order terms when the damping is known is shown in Fig. 10.24
and for the first-order terms in Fig. 10.22.
Similarly, the asymptotic phase plot vs the actual plot is shown in Fig.
10.27. The same trends as for the magnitude are noticed. Namely, the asympto-
tic plots are accurate far above and below the corner and natural frequencies
but not as accurate near them. Once again, accounting for corrections in phase
can improve the approximation sketch by using Fig. 10.25 for the second-order
terms and Fig. 10.23 for the first-order terms.
10.2.4 	Bode Stability
For controls practitioners, Bode plots can provide a very valuable insight
into system stability. Chapter 8 discusses how closing the loop on an open-
loop transfer function (OLTF) can provide varied closed-loop responses
depending on the gain. As the root locus shows, the closed-loop poles move
from the open-loop poles to the open-loop zeros as the gain increases. Thus,
the OLTF has a large impact on the closed-loop response.
It is beneficial to look at a closed-loop block diagram in Fig. 10.28 before
proceeding. Recall that the OLTF is KGðsÞHðsÞ and that the closed-loop
transfer function (CLTF) is:
CLTFðsÞ ¼ CðsÞ
RðsÞ ¼ KGðsÞ
1 þ KGðsÞHðsÞ ð10:58Þ
Fig. 10.26 	Asymptotic vs actual Bode magnitude plot.
SPECIAL TOPICS 	513

-- 529 of 650 --

The closed-loop stability is determined from the characteristic equation of Eq.
(10.58), or
1 þ KGðsÞHðsÞ ¼ 0 	ð10:59Þ
which can also be expressed as
KGðsÞHðsÞ ¼ 1 	ð10:60Þ
From a Bode plot perspective, this means that OLTF Bode plot must have a
log magnitude of less than 0 dB before the phase reaches 180 if the system
is to be closed-loop stable. The magnitude of KGðsÞHðsÞ ¼ 1 and the
phase ¼ 180 deg at the point where the closed-loop system transitions from a
stable response to an unstable response. This is the equivalent of the roots
moving from the left-half plane on a root locus plot (stable) to the right-half
plane (unstable). When the roots are on the imaginary axis, the response is
neutrally stable. From examination of Fig. 10.28, it is clear that if the original
Fig. 10.27 	Asymptotic vs actual Bode phase plot.
Fig. 10.28 	Closed-loop block diagram.
514 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 530 of 650 --

signal is phase shifted 180 deg, then inverting this signal and adding it to the
original signal will result in a doubling of the amplitude, which also leads to
instability.
There are two measures of relative stability from the OLTF Bode plot. The
first is the gain margin (GM), which is the additional gain in dB that can be
added to the system before it goes unstable (i.e., reaches 0 dB at a phase angle
of 180 deg). This is clearly analogous to the root locus limit of gain, which
can be added before the closed-loop roots go into the right-hand plane. A
stable system has a positive GM, while an unstable system has a negative GM.
The GM may also be defined as the reciprocal of the gain at which the phase
angle reaches 180 deg. This can be expressed mathematically as
GM ¼ 20 log 1
½KGHðioÞ ð10:61Þ
Another measure of relative system stability from an OLTF Bode plot is the
phase margin (PM). This is the amount of phase shift or lag (in degrees)
allowed before the system goes unstable (i.e., 0 dB at a phase angle of
180 deg). A stable system has a positive PM, while an unstable system has a
negative PM. The PM is expressed mathematically as:
PM ¼ 180 deg þ f 	ð10:62Þ
where f is the phase angle at the frequency where the magnitude crosses 0 dB.
When discussing Bode stability, two additional terms are used. The gain
crossover point is the frequency where the magnitude curve crosses 0 dB. In
addition, the phase crossover point is the frequency where the phase curve
crosses 180 deg. The key Bode stability parameters are shown in Fig. 10.29.
One important note is that if a system will never go unstable using root
locus analysis, then the same system will not go unstable using Bode analysis.
It is therefore possible to have infinite gain margin (if the phase never crosses
180 deg) or infinite phase margin (if the gain never crosses 0 dB).
Example 10.13
Find the gain margin and phase margin for the following OLTF. Is the
closed-loop system stable?
kGHðio ¼
1:25 io
2 þ 1
 	
ðioÞ io
4 þ 1
 	 io
8 þ 1
 	 io
10 þ 1
 		 	
Figure 10.30 shows the Bode plot and the resulting Bode stability margins.
The gain margin is 20.7 dB and the phase margin is 87.8 deg. Because both the
gain margin and phase margin are positive for the Bode plot of the OLTF, the
resulting closed-loop response is stable.
SPECIAL TOPICS 	515

-- 531 of 650 --

Fig. 10.29
 
Bode stability parameters.
516 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 532 of 650 --

Fig. 10.30
 
Example 10.13 Bode plot.
SPECIAL TOPICS 	517

-- 533 of 650 --

10.2.5 	Frequency Domain Specifications
Just as system performance can be discussed in terms of specifications in
the time domain (as was done in Chapter 8), frequency domain specifications
allow quantification of system performance. There are three primary frequency
domain specifications—bandwidth, resonant peak, and cutoff rate.
There are several definitions for bandwidth, but the one used for this text is
the frequency range when the log magnitude of the frequency response is
above  3dB. This corresponds to when the output to input amplitude is 0.707,
and frequency at which it occurs is called the cutoff frequency (oco). When
the output magnitude drops below that threshold, the system is not as respon-
sive. Thus, it does not have the ability to adequately track a signal whose
frequency results in an output magnitude being less than 0.707 of the input. It
is possible to have a bandwidth up to a certain frequency, as shown in Fig.
10.31, or between frequencies, as shown in Fig. 10.32.
Figure 10.31 also shows the resonant peak. This results from a system with
second-order roots. If the roots are lightly damped, the resonant peak will be
higher. The peak occurs at the natural frequency for a second-order root.
Sometimes, the frequency at which the peak occurs is called the resonant
frequency, which is shown as or in Fig. 10.31.
Finally, the third specification is called the cutoff rate. This is the rate at
which the magnitude decreases after the cutoff frequency, and is measured in
dB=dec. It is directly related to the excess of poles over zeros because the
slope 20ðnÞ dB=dec, where n is the number of excess poles in the transfer
function. If a high cutoff rate is present, high-frequency noise is more readily
attenuated, which can improve system performance.
10.2.6 	Experimental Frequency Response Determination of System
Transfer Functions
At times, real-world systems can be difficult to model mathematically.
Fortunately, there is a convenient frequency response approach that allows
experimental determination of the system transfer function. From a practical
standpoint, frequency response can be determined by inputting a sinusoidal
input at varying frequency into a system. The output magnitude and frequency,
which will also be sinusoidal, are then measured. The relationship between the
input and output sinusoid at each sinusoidal frequency is then compared to
produce a magnitude and phase at each frequency. Then, just as for the analyti-
cal case when a mathematical model is present, a Bode plot can be con-
structed. Figure 10.33 shows a block diagram of this experimental setup.
Before proceeding, it is necessary to discuss the difference between a mini-
mum phase system and a nonminimum phase system. A minimum phase
system has no poles or zeros in the right-half plane, while a nonminimum
phase system has at least one pole or zero in the right-half plane. This affects
the phase of a system. If a system is known to be minimum phase, the system
transfer function can be obtained from the magnitude plot alone. If it is not
known in advance, then both magnitude and phase information are needed.
518 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 534 of 650 --

Fig. 10.31
 
Frequency domain characteristics—resonant peak.
SPECIAL TOPICS 	519

-- 535 of 650 --

Fig. 10.32
 
Frequency domain characteristics—bandwidth range.
520 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 536 of 650 --

After the Bode plot is formed from the sets of experimental magnitude and
phase data at different frequencies, the system transfer can be obtained. The
procedure is to fit asymptotic Bode approximation lines at the corner frequen-
cies to determine pole=zero locations. One important fact to point out is that
two real poles=zeros that are close together have a frequency response very
similar to a second-order pole=zero pair with high damping ( >0.707). Thus,
the experimental method gives you only approximate system poles and zeros.
The general procedure for finding the system transfer function given an
experimental frequency response is as follows:
1) Find all single poles (20 dB=decade changes).
2) Find all single zeros (þ20 dB=decade changes).
3) Find all double real poles (40 dB=decade changes with no resonant
peak).
4) Find all double real zeros (þ40 dB=decade changes with no resonant
undershoot).
5) Find complex pole pairs (40 dB=decade changes with a resonant peak).
6) Find complex zero pairs (þ40 dB=decade changes with a resonant under-
shoot).
7) Find value for the Bode gain K (K ¼ 1 or 0 dB before any poles=zeros; If
differentiators or integrators are present, look at the o ¼ 1 point where
both have values of 0 dB).
Example 10.14
Given the experimental frequency response shown in Fig. 10.34, determine
the system transfer function. Assume the system is minimum phase.
The asymptotic Bode solution is shown in Fig. 10.35. Because the system
has a slope of 20 dB=decade at low frequencies, a free integrator is present
(1=io). Because the magnitude for a pure integrator at o ¼ 0:1 rad=s is
normally 20 dB, it is clear that a Bode gain of 20 dB (that corresponds to a
normal gain of 10) is present because the value of 40 dB at o ¼ 0:1 rad=s. The
slope decreases (becomes more positive) around 0.5 rad=s, which is indicative
of a first-order zero (1 þ o=0:5). The slope starts to become more negative
around 5 rad=s, which relates to a pole at 1=ð1 þ o=5Þ. Finally, there is a reso-
nant peak at 20 rad=s. The approximate size of the peak is 6 dB, which corre-
sponds to a zeta of 0.2 from Fig. 10.24. Thus, the second-order pole has a
natural frequency on of 20 rad=s and a damping z of 0.2. This corresponds to
Fig. 10.33 	Experimental frequency response setup.
SPECIAL TOPICS 	521

-- 537 of 650 --

Fig. 10.34 	Experimental frequency response.
Fig. 10.35 	Experimental frequency response solution.
522 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 538 of 650 --

a second-order pole of
1
1  o
on
 	2
þi 2zo
on
! ¼ 1
1  o
20
 	2
þi 0:4o
20
 	
The overall transfer function is the combination of all the individual parts.
GðioÞ ¼
10 1 þ io
0:5
 	
ðioÞ 1 þ io
5
 	
1  o
20
 	2
þi 0:4o
20
 		 	
10.2.7 	Frequency Compensation Devices
The goal of frequency compensators is to augment the performance of the
response so that it falls within desired specifications. This can be done by
placing a transfer function in various locations either inside or outside of the
feedback loop. Figure 10.36 shows the three compensator locations—prefilter,
forward path (cascade), and feedback. Note, there are parallels between the
compensators described in Sec. 9.3 for s-domain root locus applications. In
many control systems, the compensating device is an electrical circuit. Other
forms of compensators may include mechanical, hydraulic, and pneumatic
devices.
At each location, different types of compensators are used. The different
types are high-pass filters, low-pass filters, or a combination of both called
high-low pass or low-high pass filters. The high pass filters are lead compensa-
tors described in Sec. 9.3.1, the low-pass filters are the lag compensators
described in Sec. 9.3.2, and the high-low pass filters are the lead-lag compen-
sators described in Sec. 9.3.3. The following sections will describe each of the
compensators in terms of the frequency domain as opposed to the root-locus
domain.
10.2.7.1 	High-pass filters. 	The purpose of a high-pass filter compensator
is to attenuate low-frequency signals and amplify high-frequency signals.
Attenuation occurs when the output is of lower amplitude than the input, and
is the opposite of amplification. The net effect is that when a high-pass filter is
used, the system response is quickened.
Fig. 10.36 	Compensator locations.
SPECIAL TOPICS 	523

-- 539 of 650 --

10.2.7.2 	Differentiator. 	The ideal high-pass filter is a pure differentiator,
and has the form
GcðsÞ ¼ Kd s 	ð10:63Þ
or
G cðoÞ ¼ iK d o
where K d is the derivative gain.
Much insight can be gained from looking at the Bode plot for this pure
differentiator, which is shown in Fig. 10.37. Notice that for frequencies less
than 1 rad=s, the output is <0 dB, which means it is attenuated. For frequencies
> 1 rad=sec, the output is amplified. Thus, a differentiator is the simplest form
of a high-pass filter. Also, notice the phase is always þ90 deg, so it adds
phase lead to a system. Unfortunately, pure differentiators have a serious draw-
back that limits their practical application—namely, amplification of high-
frequency noise. Notice that at frequencies greater than 100 rad=s, the signal is
amplified by 40 db. Said another way, the output is 100 times the original
noise.
10.2.7.3 	Proportional plus derivative filter. 	A more usable type of high-
pass filter is a proportional plus derivative (PD) high-pass filter. The block
diagram is shown in Fig. 10.38. In the case, the output of the signal is
proportional to the magnitude and rate of the input signal.
This results in a transfer function of
G cðsÞ ¼ 1 þ Kd s 	ð10:64Þ
or
GcðoÞ ¼ 1 þ iK d o ¼ 1 þ i o
oc
where
oc ¼ 1
K d
ð10:65Þ
Notice the Bode plot of the PD filter in Fig. 10.39 (with K d ¼ 1). Once again,
notice the þ90 deg phase contribution, or phase lead. The difference is that the
phase is not added until a decade below the corner frequency defined by oc:
In this case, the lower frequencies are not attenuated, but are passed through at
the same amplitude. Higher frequencies are amplified after the corner fre-
quency. The PD filter has the same problem of amplifying high-frequency
signals, where noise usually occurs.
524 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 540 of 650 --

Fig. 10.37
 
Bode plot of an ideal high-pass filter (differentiator).
SPECIAL TOPICS 	525

-- 541 of 650 --

10.2.7.4 	Lead compensator. 	Probably the most-used high pass filter is a
lead compensator. This is defined as Eq. (9.4) in the previous chapter, but is now
put in frequency domain form.
G cðsÞ ¼ bðs þ aÞ
aðs þ bÞ ð10:66Þ
or
GcðoÞ ¼
io
a þ 1
 	
io
b þ 1
 	 ; a < b
A Bode plot for a sample lead compensator of Gc ¼ 10ðs þ 1Þ=ðs þ 10Þ is
shown in Fig. 10.40. Here, below frequency a (the zero in the filter) the signal
is not amplified. Between a and b, the amplitude gradually increases at a rate
of 20 dB=dec. After b, the amplitude is a positive gain that depends on the
separation between a and b. Thus, high frequencies are amplified (passed) and
low frequencies are not.
The phase starts at zero, and is positive a decade below a until a decade
above b, when it returns to zero. The amount of phase depends on the ratio
between a and b. The phase lead is added only around a specified region,
which can be very useful when designing a compensator. Notice that a finite
gain is applied to higher frequencies, which makes this filter much more realis-
tic to implement physically.
Figure 10.41 is a useful design aid that shows how the gain and phase are
affected by the ratio between a and b. One can control how much phase is
added and how much the final gain is applied to high frequencies by control-
ling this ratio. This plot is generated by placing the zero (the a value) at
1 rad=s, and moving the pole (the b value) further away. Notice that for a ratio
of 2, the final gain is approximately 6 dB, while for the ratio of 20 the final
gain is approximately 26 dB. This makes sense because the variation is
20 dB=dec, therefore delaying the pole for a decade results in an additional
gain of 20 dB.
The phase exhibits similar characteristics. When the ratio is 2, a maximum
phase of approximately þ20 deg is added. When the ratio reaches 20, approxi-
Fig. 10.38 	Proportional plus derivative filter.
526 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 542 of 650 --

Fig. 10.39
 
Bode plot of PD filter with
 Kd ¼ 1.
SPECIAL TOPICS 	527

-- 543 of 650 --

Fig. 10.40
 
Bode plot—lead compensator.
528 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 544 of 650 --

mately þ65 deg of phase is added. The maximum phase contribution occurs
between the pole and zero of the compensator.
Example 10.14
Using the transfer function of the root-locus lead compensator design
problem in Example 9.2, design a prefilter lead compensator to speed up the
response of the system.
The key in designing a lead compensator in the frequency domain is to add
phase lead near the first-break frequency for the basic system. Thus, a lead
compensator should add phase at approximately 1 rad=s in this example. As a
basis of comparison, use the lead compensator designed in Example 9.2.
Gc ¼ 2ðs þ 5Þ
ðs þ 10Þ
Figure 10.42 shows the Bode plot for the basic system, the lead compensator,
and the combined system. Notice that the combined system has less phase lag
because of the lead compensator, so the expected time response is faster.
Fig. 10.41 	Pole=zero ratio variation affect on lead compensators.
SPECIAL TOPICS 	529

-- 545 of 650 --

Indeed, the time response shown in Fig. 10.43 shows an increase in the speed
of response for the compensated system over the basic system.
10.2.7.5 	Washout 	filter. 	Another 	type 	of 	high-pass 	filter 	is 	used
commonly in aircraft stability augmentation systems—a washout filter. It is a
special case of the lead compensator where the zero is actually a differentiator. It
has the form
GcðsÞ ¼ Kwo s
ðs þ bÞ ð10:67Þ
or
GcðoÞ ¼
Kwo
b
 	
io
1 þ io
b
 	
The Bode plot for a washout filter with a pole at 2 rad=s and a gain of 20 is
shown in Fig. 10.44. Notice that low-frequency signals are attenuated, or
washed out. Only changes in the input are passed through. This is valuable for
aircraft feedback control because feeding back a parameter such as roll rate
with a washout filter will not affect the steady-state roll rate. Without a wash-
out filter, the stability augmentation system would constantly oppose the roll
Fig. 10.42 	Bode plot of basic, compensator, and combined systems.
530 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 546 of 650 --

Fig. 10.43
 
Time response with and without lead compensator.
SPECIAL TOPICS 	531

-- 547 of 650 --

rate and decrease the aircraft performance. The gain for high frequencies is
determined by the corner frequency and the washout filter gain Kwo. Addition-
ally, the phase lead is added at lower frequencies.
10.2.7.6 	Low-pass 	filters. 	A 	low-pass 	filter 	amplifies 	the 	lower-
frequency signals while attenuating high-frequency signals. In addition, they
have the added benefit of reducing steady-state error by increasing filter gain.
They tend to add phase lag to a system, which slows down the response.
Typically, they are used to eliminate noise, which is usually high frequency.
10.2.7.7 	Integrator. 	The ideal low-pass compensator is an integrator, and
has the form
G cðsÞ ¼ Ki
s ð10:68Þ
or
G cðoÞ ¼ K i
io
where K i is the integral gain.
The Bode plot of a pure integrator 1=s is shown in Fig. 10.45. Notice that
low frequencies are amplified (passed), while high frequencies are attenuated.
The use of pure integral control has the disadvantage of excessive lag and no
direct path between a pilot’s command and the control surface. In addition,
note that the phase is always 90 deg, which is a phase lag. This tends to
slow down the response.
10.2.7.8 	Proportional plus integral filter. 	Most applications of integral
control involve a direct linkage of the control input to the output. This is known
as a proportional plus integral (PI) filter, as shown in Fig. 10.46. The resulting
transfer function is
GcðsÞ ¼ ðs þ ocÞ
s ð10:69Þ
or
GcðoÞ ¼
oc 1 þ o
oc
 	
s
where
oc ¼ 1
K i
ð10:70Þ
532 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 548 of 650 --

Fig. 10.44
 
Washout filter Bode plot.
SPECIAL TOPICS 	533

-- 549 of 650 --

Fig. 10.45
 
Bode plot for a pure integrator (1
=s).
534 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 550 of 650 --

The Bode plot for a PI filter or controller with Ki ¼ 1 is shown in Fig.
10.47. Notice that at lower frequencies the amplitude is still positive. As the
frequency moves past the cutoff frequency (oc), the gain becomes 0 dB (or 1).
Thus, the lower frequencies are passed with a higher amplitude. Also, the
phase starts at 90 deg and ends up at almost 0 deg at a decade above the
break frequency. Thus, the overall contribution is a negative phase, or a phase
lag.
10.2.7.9 	Lag compensator. 	The most frequently used low-pass filter is a
lag compensator. The lag compensator was described in terms of the s domain in
Sec. 9.3.2. However, the lag compensator will now be defined in terms of the
frequency domain.
G cðsÞ ¼ bðs þ aÞ
aðs þ bÞ ð10:71Þ
or
GcðoÞ ¼
1 þ io
a
 	
1 þ io
b
 	 ; a > b
A Bode plot for a lag compensator of G c ¼ 0:1ðs þ 10Þ=ðs þ 1Þ is shown in
Fig. 10.48. Because the pole occurs before the zero in a lag compensator,
negative phase is initially added, and magnitude loss occurs. As was the case
with a lead compensator, the amount of phase and magnitude change depends
on the separation between the pole and zero.
As with the lead compensator, it is useful to provide a figure to show how
the phase and magnitude vary with the ratio of separation between the pole
and the zero. Figure 10.49 shows the variation of phase and magnitude for a
pole at o ¼ 1 rad=s as the zero is moved further away. Remember, for a lag
compensator the pole always occurs before the zero. The same trend is noticed
for lag compensators as for lead compensators. Also, because the magnitude
drops by 20 db=decade, each decade away from the pole that the zero is placed
results in a magnitude decrease of 20 dB.
Fig. 10.46 	PI filter.
SPECIAL TOPICS 	535

-- 551 of 650 --

Fig. 10.47
 
Bode plot of a PI filter (
sþ1)=s.
536 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 552 of 650 --

Fig. 10.48
 
Bode plot of a lag compensator—
G c(s)0:1(sþ10)
=s þ 1).
SPECIAL TOPICS 	537

-- 553 of 650 --

Example 10.15
Using the same transfer function as Example 10.14 and Example 9.3,
design a prefilter lag compensator to slow down the response of the basic
system.
As with the lead compensator design, the process starts with an examination
of the basic system Bode plot. In this case, because the desired objective is to
slow down the response, phase lag is needed around the first-break frequency
for the system. The lag compensator used in Example 9.3 will be used for
comparison purposes.
G cðsÞ ¼ 3ðs þ 10Þ
10ðs þ 3Þ
The Bode plot of the basic system, lag compensator, and combined system is
shown in Fig. 10.50. Notice that in this case there is more phase lag in the
combined system, therefore, the expected response is slower. The time res-
ponse, shown in Fig. 10.51, validates the assertion that the time response is
slower.
Fig. 10.49 	Pole=zero variation affect on lag compensators.
538 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 554 of 650 --

Fig. 10.50 	Bode plot for basic, lag compensator, and combined systems.
Fig. 10.51 	Step response for basic system and lag compensated system.
SPECIAL TOPICS 	539

-- 555 of 650 --

10.2.7.10 	Noise filter. 	The final type of low-pass filter discussed is a noise
filter. This is a special case of the lag compensator where there is no zero term.
Thus, the amplitude for low frequencies is passed until the corner frequency, when
the magnitude changes at a rate of 20 dB=decade. This allows high frequencies,
where noise is usually present, to be attenuated while the frequencies of interest
are passed. A noise filter has the following transfer function:
G cðsÞ ¼ K
ðs þ bÞ ð10:72Þ
or
G cðioÞ ¼
K
b
1 þ io
b
 	
The corner frequency is located at b rad=s. The placement of the pole deter-
mines which frequencies are passed and which are attenuated. Figure 10.52
shows a Bode plot of a noise filter with a pole at 10 rad=s and a value of
K ¼ 10.
10.2.7.11 	High–low-pass filters. 	It is possible to use the advantages of
both high-pass and low-pass filters in the same filter, called a high–low-pass filter.
Low-pass filters can produce an increase in gain, which reduces steady-state error.
High-pass filters can quicken the response, thus increasing on. The resulting
transfer function, which combines both filters into one, is
GcðsÞ ¼ K ðs þ aÞðs þ cÞ
ðs þ bÞðs þ dÞ ð10:73Þ
or
G cðioÞ ¼
K ac
bd 1 þ io
a
 	
1 þ io
c
 	
1 þ io
b
 	
1 þ io
d
 	
where
a > b; a < c; c < d
This is best observed by looking at a pole zero map shown in Fig. 10.53. Typi-
cally, the low-pass filter is closer to the origin and the high-pass filter is further
out.
The frequency response of a typical high–low-pass filter is shown in the
Bode 	plot 	of Fig. 10.54. 	In the case, a high–low-pass filter 	GcðsÞ ¼
540 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 556 of 650 --

Fig. 10.52
 
Bode plot of a noise filter with a pole at 10 rad
=s.
SPECIAL TOPICS 	541

-- 557 of 650 --

Fig. 10.53
 
Pole-zero map of a high–low-pass filter.
542 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 558 of 650 --

Fig. 10.54
 
Bode plot of a typical high–low-pass filter.
SPECIAL TOPICS 	543

-- 559 of 650 --

ðs þ 10Þðs þ 20Þ=ðs þ 1Þðs þ 200Þ is shown. Notice the phase initially goes
negative, but then goes positive before ending up at 0 deg. The magnitude
starts at 0 dB, goes negative, and then returns to 0 dB.
A special application of the high–low-pass filter that attenuates a very small
frequency range is called a notch filter. Typically, these filters are used to take
out frequencies that may cause excitation of different aircraft dynamic modes.
10.2.7.12 	Bandpass filters. 	A special case of the high–low-pass filter,
but in a slightly different form, is often used in many applications. By putting the
lead compensator before the lag compensator in Eq. (10.67), a region of positive
gain is available. This type of high–low-pass filter is called a bandpass filter
because it applies gain to a specified frequency range. In this case, a < b, b < d,
and 	c > d. 	For 	a 	sample 	bandpass 	filter 	of 	Gc ¼ ½ðs þ 1Þðs þ 200Þ=
ðs þ 10Þðs þ 20Þ the Bode plot is shown in Fig. 10.55. Notice that the frequency
response is exactly the opposite of that shown in Fig. 10.54, and that a region of
frequency is amplified.
10.3 	Digital Control
Any discussion of modern flight control must include digital control effects
because most new aircraft that have come on line, such as the Boeing 777 and
the F-22 Raptor, have digital flight control systems (as opposed to analog
systems). The goal of this section is a top-level overview of some of the key
concepts for digital control systems. There are many advantages to digital
flight control, but there are also several disadvantages.
10.3.1 	Digital Control Advantages
There are many advantages to digital flight control systems:
1) They are more versatile than analog because they can be easily repro-
grammed without changing hardware.
2) It is easy to implement gain scheduling to vary flight control gains as the
aircraft dynamics change with flight condition.
3) Digital components in the form of electronic parts, transducers, and
encoders are often more reliable, more rugged, and more compact than
analog equivalents.
4) Multimode and more complex digital control laws can be implemented
because of fast, light, and economical microprocessors.
5) It is possible to design ‘‘robust’’ controllers that can control the aircraft for
various flight conditions, including some mechanical failures.
6) Improved sensitivity with sensitive control elements that require relatively
low-energy signals.
10.3.2 	Digital Control Disadvantages
As with most engineering applications, there are positive and negative
implications for the use of digital control. The disadvantages are listed next:
544 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 560 of 650 --

Fig. 10.55
 
Bode plot of a typical bandpass filter.
SPECIAL TOPICS 	545

-- 561 of 650 --

1) The lag associated with the sampling process reduces the system stability.
2) The mathematical analysis and system design of a sampled-data system is
sometimes more complex than an analog system.
3) The signal information may be lost because it must be digitally recon-
structed from an analog signal.
4) The complexity of the control process is in the software-implemented
control algorithms that may contain errors.
5) Software verification becomes critical because of the safety of flight
issues—software errors can cause the aircraft to crash.
Some of these disadvantages become less stringent because of rapid
increases in computer and microprocessor technology that allow high sampling
rates. However, the biggest issue is getting all the software ‘‘bugs’’ out before
flight.
10.3.3 	Digital Control Overview
A digital controller must take an analog signal, sample it with an analog-to-
digital converter (A=D), process the information in the digital domain, and
then convert the signal to analog with a digital-to-analog (D=A) converter. The
key here is to provide redundant paths in the event of a hardware failure. An
overall digital flight control block diagram is shown in Fig. 10.56. Here, the
signal comes from a sensing device, such as a gyro. Next, it is fed in parallel
along multiple paths (three in this case) to an A=D. After the signal is in digi-
tal form, the flight control computers execute the control algorithms. The
output from the flight control computers is then fed to D=A converters, which
in turn operate an actuator. For example, a pitch attitude signal may be fed
back for a pitch attitude hold system. In this case, the signal travels from the
Fig. 10.56 	Overall digital flight control system block diagram.
546 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 562 of 650 --

gyro through the A=D, where it is then compared to a reference signal. After
the control algorithm calculates the necessary control signal, the output is
routed through a D=A converter and fed to the elevator to maintain pitch
attitude.
The processing must consider sampling delays when working on the control
information. A block diagram of a simple digital controller is shown in Fig.
10.57. In this figure, the capital T denotes the sampling time associated with
the sampling process. It is the time interval between each sampling of the
signal. The continuous time signal are functions of time (t), while the discrete
signals are functions of the specific sample number k. The basic processes
such as A=D and D=A conversion are presented next.
10.3.4 	Analog-to-Digital Conversion
The A=D converter is a sampling device that converts an analog signal to a
digital signal by sampling at a discrete time interval T. It is possible to sample
at different rates; however, normally all samples are taken at the same rate for
simplicity in analysis and design. Figure 10.58 shows the block diagram of a
simple A=D converter.
The fidelity of the A=D conversion depends upon the sampling rate and the
highest frequency in the signal. The sample signal is actually a train of
impulses defined by
r*ðtÞ ¼ rðtÞdt ðtÞ
Figure 10.59 shows a sampled signal compared to an analog signal. Notice
that the sampled signal is available at discrete points that attempt to recreate
the signal. The best representation of the signal is analog, which can never
realistically be achieved with a digital sampling of the signal. If the sampling
Fig. 10.57 	Typical digital control block diagram.
Fig. 10.58 	A=D converter block diagram.
SPECIAL TOPICS 	547

-- 563 of 650 --

rate is low compared to the signal frequency, inaccurate data will result. Figure
10.60 shows the digital representation of the same signal with a much lower
sampling rate.
Unfortunately, it is not practical to instantaneously sample a signal and feed
it into a computer. The practical application of an A=D converter is a sample
and hold (S=H) device that samples the signals at discrete intervals and holds
that value until the next sample. Figure 10.61 shows an example S=H signal.
10.3.5 	Digital-to-Analog Conversion
After the signal has been converted to digital and processed by the compu-
ter, the signal must then be converted to analog to run devices like control
actuators. This process is called D=A conversion. The most common type of
D=A device is a zero-order hold (ZOH). It essentially works the opposite of an
A=D sample and hold device in that a digital signal at a discrete value is held
for a sample period until the next discrete value is used. Figure 10.62 illus-
trates what a ZOH D=A signal looks like.
One concern with early digital flight control systems were quantization
effects associated with the digital nature of the D=A ZOH output. Pilots were
concerned that the discrete nature of the command signal to the flight control
actuators would translate to abrupt discrete aircraft motion. This was shown in
early flight tests to be easily overcome with sample rates above 40 per s.
Fig. 10.59 	Sampled signal example.
548 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 564 of 650 --

10.4 	Advanced Control Algorithms
Although the purpose of this text is to introduce students to classical control
techniques and flight control systems, a short discussion of more advanced
flight control systems and techniques is included. Students in advanced flight
control jobs will use many additional tools, and this section mentions some of
them so the student has an idea of other techniques that are available.
10.4.1 	Integrated Flight Control Systems
Traditionally, aircraft flight controls, propulsion, avionics, and sensors have
been separate components of an aircraft that only interact through control by
Fig. 10.60 	Incorrect sampling time for a signal.
Fig. 10.61 	SH signal.
Fig. 10.62 	D=A ZOH output example.
SPECIAL TOPICS 	549

-- 565 of 650 --

the pilot. With fly-by-wire systems, integration of these important aspects of an
aircraft is possible.
Integration of flight controls with avionics and sensors gives the capability
of automated air-to-surface and air-to-air weapons deliveries with significant
reduction in pilot workload. It also provides the capability for automated colli-
sion avoidance systems that significantly enhance safety. One of the most
recent advances that can easily be integrated into an overall flight control
system is the Global Positioning System for navigation purposes. Also, integra-
tion of flight controls with the propulsion system promises increased capability
for range–payload performance and maneuverability.
One early example (mid 1980s) of an aircraft that considered many aspects
in the flight control system design is the Advanced Fighter Technology Inser-
tion (AFTI) F16. This system sought to develop an automated maneuvering
attack system (AMAS) for both air-to-air and air-to-surface attack. The system
used automated maneuvering using inertial navigation and a conformally
mounted surface tracker that contained an infrared tracker, laser range finder,
and target state estimator (also known as a Kalman filter). Automated maneu-
vering consisted of ingress steering, curvilinear weapons delivery, and a target
egress. A block diagram of this system is shown in Fig. 10.63.
10.4.2 	Robust Control
Another area that shows great potential for flight applications is robust
control. Robust control, from an aircraft feedback control standpoint, is the
ability of a single controller to operate under multiple flight conditions. Also,
robust controllers have the potential to operate the aircraft despite failures of
some noncatastrophic aircraft systems. Currently, the changes in flight condi-
tions are handled through gain scheduling based on flight condition. However,
problems can occur if there is sensor noise on the parameters for which the
gain is scheduled. Also, the gain changes may produce sudden changes in the
aircraft’s handling characteristics, which cause the pilot’s workload to increase.
Typically, robust controllers will design for several plant conditions for a
desired ‘‘performance envelope.’’ Although a robust controller may not be the
optimum solution at any specific flight condition, it will provide acceptable
Fig. 10.63 	AMAS closed-loop control.
550 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 566 of 650 --

flight performance for all flight conditions within its designed envelope. There
are many different robust control techniques that have been applied to aircraft
applications. These include H-infinity, quantitative feedback theory, fuzzy
logic, direct reduced-order optimization, neural networks, and adaptive control.
All have shown some degree of success for flight applications.
10.5 	Reversible and Irreversible Flight Control Systems
The system that connects the pilot’s stick (or yoke) and rudder pedals to the
aircraft flight control surfaces can affect the stability and control characteristics
of the aircraft. Two broad categories of flight control system connections will
be discussed to illustrate the important differences.
10.5.1 	Reversible Flight Control Systems
In a reversible flight control system, the cockpit controls are directly
connected to the aircraft flight control surfaces through mechanical linkages
such as cables, pushrods, and bellcranks. There is no hydraulic actuator is this
path and the muscle to move the control surfaces is provided directly by the
pilot. Figure 10.64 provides an illustration of a reversible flight control system.
With no hydraulic or electrical power on the aircraft, a reversible flight
control system will have the following characteristics: movement of the stick
and rudders will move the respective control surface, and hand movement of
each control surface will result in movement of the respective cockpit
control—hence the name ‘‘reversible.’’ A quick check to determine if a system
is reversible can be accomplished by simply walking up to an aircraft and
moving the trailing edge of the elevator up and down by hand. If the pilot’s
stick moves back and forth, the system is reversible. Of course, the ailerons
and rudder should be checked in the same manner.
Reversible flight control systems are normally used on light general aviation
aircraft such as those produced by Cessna, Beachcraft, and Piper. They have
the advantage of being relatively simple and ‘‘pilot feel’’ is provided directly
by the airloads on each control surface being transferred to the stick or rudder
pedals. They have the disadvantage of increasing stick and rudder forces as the
airspeed of the aircraft increases. As a result, the control forces present may
exceed the pilot’s muscular capabilities if the aircraft is designed to fly at high
speed. Of course, the definition of ‘‘high speed’’ depends on the size of the
Fig. 10.64 	Example of a reversible flight control system.
SPECIAL TOPICS 	551

-- 567 of 650 --

control surface and the size of the aircraft because these also directly effect
pilot control forces. When high pilot control forces become a problem, it is
generally time to incorporate a hydraulically boosted or irreversible flight
control system into the design of the airplane.
Two types of static stability must be considered with reversible flight control
systems. Stick-fixed stability implies that the control surfaces are held in a
fixed position by the pilot during a perturbation. Stick-fixed stability was
assumed for all the static-stability derivative development in Chapter 5 and
subsequent chapters. Stick-fixed stability provides the largest magnitude for
derivatives such as C ma and C nb . Stick-free stability implies that the stick and
rudder pedals are not held in a fixed position by the pilot but rather left to
seek their own position during a flight perturbation. In other words, this is the
situation where the pilot lets go of the stick (and pedals). For example, a posi-
tive perturbation from the trim angle of attack will result in the elevator float-
ing up (or a negative change in de) for the stick-free condition because of the
resulting aero loads on the elevator. This situation provides less restoring
moment back toward trim and reduced static stability, as illustrated in Fig.
10.65.
The conclusion is that stick-free stability is lower in magnitude than stick-
fixed stability. This also directly affects the concepts of neutral point and
maneuver point as presented in Secs. 5.4.3 and 5.4.4. The stick-fixed situation
was assumed in the presentation of neutral point and maneuver point in these
sections. The stick-free neutral point will be forward of the stick-fixed neutral
point, which indicates that neutral stability will occur for the stick-free case at
a c.g. location that still has positive static stability for the stick-fixed case. As
a result, the stick-free case is the most critical and the one to be considered
when determining the aft c.g. limits for an aircraft with a reversible flight
control system. Another conclusion is that the pilot can increase the static
stability of the aircraft by holding the stick fixed rather than letting it go. This
also has dynamic stability implications because of the static stability derivative
contribution to short-period and dutch-roll characteristics as discussed in Secs.
7.3.2.2 and 7.3.3.4. A similar effect is present for maneuver point where the
stick-free maneuver is located forward of the stick-fixed maneuver point.
Maneuvering may appear to be a situation where stick free would not be
applicable. However, it should be kept in mind that the aircraft can be trimmed
in a flight condition where the load factor is greater than one. Figure 10.66
Fig. 10.65 	Illustration of stick-fixed and stick-free elevator travel during an angle of
attack perturbation.
552 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 568 of 650 --

illustrates the relative locations of the stick-fixed and stick-free neutral point
and maneuver point.
Methods to determine the location of the stick-free neutral point and maneu-
ver point involve analysis of the hinge moments acting on each surface and
gearing ratios appropriate to the flight control system design. Reference 1
contains methods for doing this.
10.5.2 	Irreversible Flight Control Systems
In an irreversible flight control system, the cockpit controls are either
directly or indirectly connected to a controller that transforms the pilot’s input
into a commanded position for a hydraulic or electromechanical actuator. The
most common form of an irreversible flight control system connects the pilot’s
displacement or force command from the stick or rudder pedals to a control
valve on a hydraulic actuator. The control valve positions the hydraulic actua-
tor that, in turn, moves the flight control surface. Irreversible systems were first
implemented to provide the hydraulic muscle needed to move flight control
surfaces at high speeds. Nearly all high speed aircraft flying today have irrever-
sible flight control systems. These generally include all aircraft outside the
general aviation category. Figure 10.67 illustrates an irreversible flight control
system.
Fig. 10.66 	Relative location of stick-fixed and stick-free neutral point and maneuver
point.
Fig. 10.67 	Example of an irreversible flight control system.
SPECIAL TOPICS 	553

-- 569 of 650 --

Such a system is called irreversible because manual movement of a control
surface (only possible when the hydraulic power is off) will not be transferred
to movement of the stick or rudder pedals. Movement of the control surface
will move the hydraulic actuator but will not be transferred back through the
control valve. Irreversible flight control systems behave as essentially a stick-
fixed system when the aircraft undergoes a perturbation because the hydraulic
actuator holds the control surface in the commanded position—even if the pilot
has let go of the stick. Thus, the stick-free concepts discussed with reversible
flight control systems are not applicable to irreversible systems. Irreversible
flight control systems are also ideal for incorporation of automatic flight
control system (AFCS) functions such as inner-loop stability and outer-loop
autopilot modes (Reference Chapter 9) because the AFCS actuator only has to
reposition the actuator control valve and not the heavily air-loaded control
surface. A disadvantage of irreversible flight control systems is that artificial
pilot feel must be designed into the stick and rudder pedals because the air
loads on the control surfaces are not transmitted back. Artificial pilot feel is
normally accomplished with a combination of springs and a bobweight (for
longitudinal feel) on the stick, and springs on the rudder pedals. Flight test
development is normally required to optimize the design of any artificial feel
system.
10.6 	Spins
Spins are perhaps the most complex of the many coupled motions that an
aircraft can perform. The beginning of a spin may follow a stall if the aircraft
is allowed to continue the pitching, rolling, and=or yawing motions occurring
during the post-stall phase without corrective action. Because of the post-stall
rolling and yawing motions, an imbalance in angle of attack may occur
between wings. One wing may experience an increase in lift and a decrease in
drag compared to the other wing, which can result in moments that amplify
the rolling and yawing, and place the aircraft in an auto-rotation. In a spin, the
aircraft descends rapidly toward the Earth in a helical motion about a vertical
axis at an angle of attack greater than the stall angle of attack. Departures
from controlled flight may be momentary, benign events or may be violent and
lead to an undesirable trimmed flight condition—the spin. Early high-perfor-
mance airplanes such as the F-86 had benign stall characteristics, with buffet
followed by a g break resulting in a symmetrical nose down motion. As wings
became more swept back with sharper leading edges and stronger vortical
flows, the angle of attack at stall and resulting maximum lift increased signifi-
cantly. This led to improved turn performance because turn rate increases with
lift coefficient (Sec. 3.9). It also led to a different type of stall, called yaw
divergence, because directional stability was usually lost near the increased
stall angle of attack. Yaw divergence can result in a departure from controlled
flight and may cause the aircraft to enter a spin from which it may or may not
recover depending on the effectiveness of the aerodynamic controls. Adequate
lateral and directional stability (C lb , Cnb ), either natural or augmented by the
flight control system, became essential to prevent departure. In addition to a
buildup of sideslip because of inadequate directional stability, a departure can
554 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 570 of 650 --

also result from an asymmetric orientation of vortices on the forebody, result-
ing in a large side force and yawing moment. This phenomenon is known as
‘‘nose slice.’’ The A-7 and F-4 both suffered from nose slice type departures.
More than 60 F-4s were lost in out-of-control situations resulting from high
angle of attack stall=spin problems, including three during Air Force and Navy
spin tests.
A spin is often characterized as a steady, helical motion about the vertical
axis with a rapid rate of vertical descent as shown in Fig. 10.68.
This is done in the interest of simplicity, as many spins are oscillatory and
therefore unsteady in nature. For the simplified steady condition with the spin
angular rate about the spin axis represented by O; the aircraft drag balances
the weight while the lift is balanced by the centrifugal force (CF):
W ¼ mg ¼ 1=2rV 2SC D 	ð10:74Þ
CF ¼ mRsO2 ¼ 1=2rV 2SC L 	ð10:75Þ
The spin radius (Rs) may be solved from these as
Rs ¼ gðCL=C DÞ=O2 	ð10:76Þ
Fig. 10.68 	Fundamental spin characteristics.
SPECIAL TOPICS 	555

-- 571 of 650 --

The radius is typically a fraction of the wing span. For a spin to be maintained,
the aerodynamic and inertial moments because of the motion must be
balanced. Neglecting the product of inertia (I xz) and moments because of
thrust, the moment equations of motion [see Eq. (4.69)] may be written as
L A ¼ ð1=2ÞrV 2SbC l ¼ _PPI xx þ QRðI zz  I yyÞ 	ð10:77Þ
M A ¼ ð1=2ÞrV 2ScC m ¼ _Q	QI yy þ PRðI xx  IzzÞ 	ð10:78Þ
N A ¼ ð1=2ÞrV 2SbC n ¼ _RRI zz þ PQðI yy  I xxÞ 	ð10:79Þ
The steady nature of the spin gives
_PP ¼ _Q	Q ¼ _RR ¼ _yy ¼ _ff ¼ 0 	ð10:80Þ
Realizing that the spin rate, O, may be denoted as dc=dt, the kinematic equa-
tions [Eq. (4.80)] can be reduced to
P ¼  _cc sin y þ _ff ¼ O sin y 	ð10:81Þ
Q ¼ _cc sin f cos y þ _yy cos f ¼ O cos y sin f 	ð10:82Þ
R ¼ _cc cos f cos y  _yy sin f ¼ O cos y cos f 	ð10:83Þ
Because the velocity vector in a spin is near vertical, it is conventional to
define the spin pitch angle (ys) from this axis, namely
ys ¼ 90 þ y 	ð10:84Þ
Spins are generally categorized as steep or flat, and can be entered in either an
upright or inverted orientation. In a steep spin, the nose is pointed down with
spin pitch angles ranging from approximately 30 to 50 deg. There is a signifi-
cant spiral motion with a marked radius. A flat spin looks like it sounds, with
the vehicle nearly horizontal. Flat spin pitch angles range from approximately
70 to 90 deg and the spin radius is very small. The rate of rotation in a flat
spin is approximately double that of a steep spin, and recovery is more diffi-
cult.
The spin rate is typically expressed in terms of the nondimensional quantity
(Ob=2V ). Substituting Eqs. (10.81–10.84) into Eqs. (10.77–10.79) results in
the following:
C l ¼ Ob
2V
 	2 4
rSb3 ðI zz  I yyÞ sin2 ys sin 2f 	ð10:85Þ
Cm ¼ Ob
2V
 	2 4
rScb2 ðI xx  I zzÞ sin 2ys cos f 	ð10:86Þ
Cn ¼ Ob
2V
 	2 4
rSb3 ðI yy  I xxÞ sin 2ys sin f 	ð10:87Þ
556 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 572 of 650 --

These are the equations used to analyze a simplified steady spin. The aerody-
namic moments appear on the left with the inertial moments on the right. For
typical aircraft, the concentration of mass along the fuselage results in a yaw
inertia much larger than the roll inertia (I ZZ  I XX ). This indicates that a nega-
tive (nose down) pitching moment is required to maintain a spin. As the spin
becomes flatter, the size of the required moment reduces. The required aerody-
namic roll and yaw moments are usually small because the roll angle in a spin
(f) is small. The rudder is the primary control used to recover from a spin. It
provides a yawing moment that reduces the rotational velocity, O, by deflecting
it in opposition to the motion. Trailing edge down elevator is sometimes used
after application of the rudder to reduce the angle of attack to below stall.
However, there is not one general rule (which covers all aircraft) for the eleva-
tor in spin recovery. For modern fighter aircraft, Iyy is generally greater than
I xx. For this case, the aircraft my be excited in pitch and roll to generate a
pitch rate (Q) and roll rate (P) so that an inertial yaw acceleration opposite to
the spin direction will result in accordance with Eq. (10.79) to arrest the spin.
Another technique is to pump the stick fore and aft in an attempt to induce
pitching oscillations that can be used to reduce the angle of attack and initiate
a spin recovery.
Spin characteristics can be measured in a wind tunnel by rotating an aircraft
model about an axis aligned with the freestream velocity. By testing at a var-
iety of pitch and roll orientation angles and various rotation rates, a database
can be developed that is canvassed for points satisfying Eqs. (10.85–10.87).
The variation in yawing moment with rotation rate for the F-18 and X-29 with
neutral controls at ys ¼ 90 deg are shown in Fig. 10.69.
Here, the aerodynamic pitching and yawing moment required to sustain a
spin are zero. The F-18 shows a stable slope, with restoring yaw moments
Fig. 10.69 	Wind tunnel spin characteristics for the X-29 and F-18.
SPECIAL TOPICS 	557

-- 573 of 650 --

found with rotation. The X-29 is unstable in yaw, with a negative slope at the
higher rotation rates. It intersects the x axis (zero yawing moment) at
Ob=2V ¼ 0:14, satisfying Eq. (10.87). The slope of the yawing moment curve
must be negative (stable) at this intersection to maintain a spin. With a stable
slope, an increase in spin rate results in a negative yawing moment that slows
the spin, while a decrease in spin rate results in a positive yawing moment,
thereby increasing the spin.
An example will help clarify how the wind tunnel data may be used. For a
forward c.g. location, Eqs. (10.85–10.87) were all satisfied at ys ¼ 89 deg,
indicating a flat spin mode for the X-29. To compute the spin properties for
this case, the aerodynamic data from ys ¼ 90 deg will be used assuming an
aircraft weight of 15,000 lb, a 27.2-ft wing span, a 185 sq ft wing area, and
flight at 30,000 ft (r ¼ 0:000889 sl=ft 3 ). The lift and drag coefficients were
measured as 0.14 and 2.64, respectively. Equation (10.74) may be used to
solve for the velocity, which in a spin is the descent rate. A value of 262 ft=s is
obtained. The rotation rate is computed from Ob=2V ¼ 0:14 as 2.7 rad=s. The
time to complete one turn in the spin is 2p=O ¼ 2:3 s, which is indicative of a
fast spin. The spin radius is computed from Eq. (10.76) as 0.3 ft.
A design procedure does not exist for a spin proof airplane, but guidelines
have been developed over the years. The relative location of the horizontal and
vertical tail is known to be important, with T-tail or aft-mounted horizontal tail
locations preferred. Spin recovery is contingent on having available aerody-
namic control, primarily rudder control, at extreme angles of attack. For many
years, a guideline known as the tail damping power factor (TDPF) was used to
estimate spin recovery characteristics. At high angles of attack, some (or all) of
the vertical tail and rudder may become blanketed by the horizontal tail. The
TDPF attempted to quantify this effect by assuming that only the portion of
the vertical tail and rudder that were not blanketed by horizontal tail would
contribute to spin recovery. It also considered the portion of the aft fuselage
that was directly beneath the horizontal tail. A landmark test completed in
1989 measured the pressure distribution on the fuselage, horizontal, and verti-
cal tails of a proposed trainer aircraft. This test showed that the assumptions
behind the TDPF were incorrect. Large pressure differences were found across
the vertical tail whether or not a horizontal tail was present. Significant pres-
sure differences were also found from the portion of the aft fuselage forward
of the horizontal tail. The study concluded that the TDPF should not be used
as a guide.
10.7 	Historical Snapshot—The F-16 Fly-by-Wire System
The F-16 was the first production aircraft to incorporate a fly-by-wire
control system as discussed in Sec. 9.1.3. The prototype F-16 made its first
flight in the mid-1970s and, since then, fly-by-wire has been fairly common in
high-performance aircraft designs. A simplified version of the F-16 multiloop
flight control system will be analyzed in this section. Keep in mind that
although the block diagrams are shown in the s domain, the actual implementa-
tion is through A=D and D=A sensors that interface with a flight control
computer on the aircraft. The other assumption not explicitly stated is that the
558 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 574 of 650 --

sample rate is fast enough so that the sampling lag that might adversely affect
stability is negligible. The F-16 iteration rates are on the order of 80=s, which
is fast enough to overcome sampling lag problems. If there is a case where this
is not true, digital design techniques exist to allow for sampling delays directly.
The most common of these is the z transform, which will not be discussed
because it is beyond the scope of this book.
For the longitudinal F-16 flight control scheme, there are three pertinent
transfer functions—a=de, q=de, n z=de. For a Mach 0.6 F-16 at sea level, the
transfer functions are
a
de
¼ 0:203ðs þ 0:0087  0:067iÞðs þ 106:47Þ
ðs  0:087Þðs þ 2:373Þðs þ 0:098  0:104iÞ
deg
deg
q
de
¼ 21:516sðs þ 0:0189Þðs þ 1:5Þ
ðs  0:087Þðs þ 2:373Þðs þ 0:098  0:104iÞ
deg=s
deg
n z
de
¼ 0:0889sðs þ 0:0158Þðs þ 1:165  11:437iÞ
ðs  0:087Þðs þ 2:373Þðs þ 0:098  0:104iÞ
g
deg
The n z transfer function is for the accelerometer location. The simplified F-16
longitudinal flight control system for Mach 0.6 at sea level is shown in Fig.
10.70.
The gains F2 and F3 are scheduled based on flight condition. Gain F2 is a
function of dynamic pressure divided by static pressure, while gain F3 is a
function of static pressure alone. The system is shown in a clearer representa-
tion with feedback loops in Fig. 10.71.
For analysis, the F-16A block must be represented in terms of the three
transfer functions previously defined. This is shown in Fig. 10.72.
The q=a transfer function is obtained by dividing the q=de transfer function
by the a=de transfer function. Similarly, the n z=q transfer function is obtained
by dividing the n z=de transfer function by the q=de transfer function. Please
note that in the following development any transfer function with GH is an
OLTF. Also, any transfer function with a ‘‘_cl’’ represents a CLTF.
The inner loop is closed at a gain of Ka ¼ 0:5. This results in an innermost
loop CLTF of:
G a clðsÞ
¼ 4:1ðs þ 0:0087  0:067iÞðs þ 106:47Þðs þ 10Þ
ðs þ 0:0083  0:0643iÞðs þ 0:478  3:03iÞðs þ 12:1Þðs þ 19:6Þ
The angle of attack feedback has stabilized the short-period roots (complex
roots furthest from the imaginary axis), but the damping is low for the short
period 0:156. The natural frequency is 3.07 rad=s.
SPECIAL TOPICS 	559

-- 575 of 650 --

Fig. 10.70
 
Simplified F-16 longitudinal flight control system, Mach
 ¼ 0.6 at sea level.
560 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 576 of 650 --

Fig. 10.71
 
F-16 feedback loop view.
SPECIAL TOPICS 	561

-- 577 of 650 --

Fig. 10.72
 
Simplified F-16 longitudinal flight control system for analysis.
562 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 578 of 650 --

The next step is to improve (increase) the damping with pitch rate (q) feed-
back. The block diagram for this step is shown in Fig. 10.73. Thus, the OLTF
for the pitch loop is
G oltf q ¼ Gain1*PI*G a cl*Gq=a 	GLead*gain*washout
or
GHqðsÞ ¼
498:42ðs þ 0:0189Þðs þ 1:5Þðs þ 4Þðs þ 5Þ
ðs þ 0:0083  0:0643iÞðs  0:478  3:03Þðs þ 12:1Þðs þ 19:6Þðs þ 1Þðs þ 12Þ
Closing the pitch rate loop with ‘‘static’’ gain of 498.42 results in a pitch rate
CLTF of
G q alpha clðsÞ ¼ 497:43ðs þ 0:0189Þðs þ 1:5Þðs þ 10Þðs þ 5Þðs þ 1Þðs þ 12Þ
ðs þ 0:0093  0:023iÞðs þ 1:33Þðs þ 3:78  i2:68Þ
ðs þ 10:2Þðs þ 13:3  20:2iÞ
This results in a new short-period damping of zsp ¼ 0:816 and a new natural
frequency of onsp ¼ 4:63 rad=s.
The CLTF from the inner two loops now becomes part of the outer-loop
transfer function for the outer nz loop. This is shown in Fig. 10.74.
Thus, the new outer-loop, open-loop transfer function becomes
GHn zðsÞ ¼ 2:055ðs þ 0:0058Þðs þ 1:165  11:437iÞðs þ 10Þðs þ 5Þðs þ 1Þ
ðs þ 0:0093  0:023iÞðs þ 1:33Þðs þ 3:78  2:68iÞðs þ 10:2Þ
ðs þ 12Þ3ðs þ 4Þ
ðs þ 13:3  20:2iÞðs þ 12Þ
Closing this with a gain of Kn z ¼ 6:165 results in an overall CLTF of
GHn zcl ðsÞ ¼ 2:055ðs þ 0:0158Þðs þ 1:165  11:437iÞðs þ 10Þ
ðs þ 0:0164Þðs þ 1:74Þðs þ 3:86  3:32iÞðs þ 0:637Þ
ðs þ 5Þðs þ 1Þðs þ 12Þ
ðs þ 10:3Þðs þ 15:7  17:6i
8:3
ðs þ 8:3Þ
The last term in the previous equation is the prefilter. Notice that there are
poles at 1:74 and 0:637. These are close to the short-period roots at
3:86  3:32i, and will have some effect on the short-period response. These
two roots will tend to slow down the short-period response. The aircraft
response to a unit load factor input is shown in Fig. 10.75.
Notice that the prefilter slows the response down slightly. The response is
dominated by the two real poles, rather than the short-period poles.
SPECIAL TOPICS 	563

-- 579 of 650 --

Fig. 10.73
 
F-16 longitudinal flight control system with
 Ka¼ 20:5.
564 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 580 of 650 --

Fig. 10.74
 
Simplified F-16 longitudinal flight control system with 2 inner loops closed.
SPECIAL TOPICS 	565

-- 581 of 650 --

Fig. 10.75
 
Load factor response with and without prefilter.
566 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 582 of 650 --

Problems
10.1 	For the following system unity feedback system, determine the system
type, Kp, Kv, and K a.
GðsÞ ¼ 4ðs þ 2Þ
sðs þ 4Þðs þ 8Þ
10.2 	What is the steady-state error of the previous system for unit step, unit
ramp, and unit parabolic inputs?
10.3 	Express the complex number zz ¼ 2 þ 4j in terms of magnitude and
phase angle.
10.4 	Convert the following transfer function to Bode form and identify the
Bode gain.
GðsÞ ¼ 3ðs þ 1Þðs þ 4Þ
sðs þ 3Þðs2 þ 2s þ 8Þ
10.5 	Calculate the log magnitude and phase of the transfer function in
Problem 4 for a frequency of 5 rad=s and 10 rad=s. What is the differ-
ence in the magnitude and phase for the two frequencies?
10.6 	Construct a magnitude and phase angle Bode plot using asymptotic
approximations for
GðioÞ ¼ 10ð1 þ ioÞ
ðioÞ2 1 þ io
4  o
4
 2
 	
10.7 	Find the gain margin, phase margin, gain crossover frequency, phase
crossover frequency, and bandwidth for the following system using a
Bode plot generated by any applicable computer software package.
GðsÞ ¼ 10ðs þ 2Þ
sðs þ 1Þðs2 þ 4s þ 16Þ
10.8 	Find the transfer function GðioÞ and GðsÞ for the following Bode
magnitude plot. Assume a minimum phase system.
SPECIAL TOPICS 	567

-- 583 of 650 --

10.9 	Estimate the damping ratio and natural frequency for the following
second order pole from the following plot.
568 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 584 of 650 --

10.10 	Match the following:
System Problem=Objective 	Filter to Use
Pass a range of frequencies _____ 	(a) lag
Too much SS error _____ 	(b) lead
System response too slow _____ 	(c) lag lead
Eliminate a specific frequency _____ 	(d) noise (lag)
Improve SS error and quicken response _____ 	(e) notch
Eliminate unwanted high frequency signals_____ 	(f) band pass filter
10.11 	For the following system, is there any value or range of K that can
satisfy the following specifications?
Kv  2
gain margin  4
G ¼ K
sðs þ 2Þðs þ 4Þ
If the specifications cannot be met, design a lead compensator to meet
them.
10.12 	The primary disadvantage of a pure integrator ð1=sÞ is
(a) 	Increases oN
(b) 	Increases od
(c) 	Adds phase lag
(d) 	Increases steady-state error
10.13 	The following system has a gain margin of 14.7 dB and a phase
margin of 60.4 deg. Add a lead compensator so that the phase margin
is between 90 and 110 deg.
G ¼ 40ðs þ 1Þ
sðs þ 0:5Þðs þ 5Þðs2 þ 2s þ 20Þ
10.14 	An aircraft is experiencing problems with 400-Hz power noise. Design
a lag-lead compensator in the forward path that will provide at least
10 dB attenuation at 400 Hz.
10.15 	Design a noise filter in the forward path that will provide between 10
and 20 dB attenuation at 100 Hz.
SPECIAL TOPICS 	569

-- 585 of 650 --

10.16 	The load factor response for an aircraft is too fast. Design a lag pre-
filter to slow the rise time down from 3.33 s to between 4 and 4.5 s
using frequency domain techniques. The system transfer function can
be approximated as
GðsÞ ¼ 1:31
ðs þ 0:75Þðs þ 1:75Þ
10.17 	A digital controller is experiencing problems with a system whose
dominant mode is at 20 Hz. If the sample period is 100 ms, what is the
probable cause of the problem?
10.18 	What are some of the problems associated with digital control?
570 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 586 of 650 --

Appendix A
Conversions
1. 	Length:
1 foot (ft) ¼ 0.3048 meters (m)
1 statute mile (sm) ¼ 5280 ft ¼ 0.8690 nautical miles (nm)
¼ 1.609 kilometers (km)
2. 	Velocity:
1 foot=s (ft=s) ¼ 0.5921 nm=h (kn) ¼ 0.6818 m=h (mph) ¼ 1.097 km=h
1 kt ¼ 1.689 ft=s ¼ 1.151 sm=h ¼ 1.852 km=h
1 mph ¼ 1.467 ft=s ¼ 0.8684 kn ¼ 1.609 km=h
3. 	Pressure:
1 lb=ft2 (psf) ¼ 0.006944 lb=in 2 (psi) ¼ 47.88 newtons=m 2 (nt=m 2 )
1 psi ¼ 144 psf ¼ 6895 nt=m 2
4. 	Temperature:
F ¼ 9
5 ðCÞ þ 32
C ¼ 5
9 ð F  32Þ
R ¼  F þ 459:69
K ¼  C þ 273:16
5. 	Frequency=Rotation:
1 radian=s (rad=s) ¼ 57.296 deg=s ¼ 0.1592 revolutions=sec ¼ 9.549
revolutions=min (rpm)
571

-- 587 of 650 --

This page intentionally left blank

-- 588 of 650 --

Appendix B
Properties of the U.S. Standard Atmosphere
In this appendix the properties of the 1962 U.S. Standard Atmosphere are tabu-
lated in accordance with Eqs. (1.5–1.17) and (1.21–1.22) of Chapter 1. Two
tables are given: Table B1 in English units and Table B2 in Metric units.
Table B1 	U.S. Standard atmosphere in English units
Altitude Temper-
ature
Temper-
ature
ratio
Pressure 	Pressure
ratio
Density 	Density
ratio
Coefficient
of
viscosity
Speed of
sound
h;ft 	T ; R 	y 	P; psf 	d 	r 	s 	m 	a, ft=s
slugs
ft3
lb  sec
ft2
103 	107
0 	518.7 	1.000 	2116 	1.000 	2.377 	1.000 	3.737 	1,116.4
1,000 	515.1 	0.9932 	2041 	0.9644 	2.3081 	0.97106 	3.717 	1,112.6
2,000 	511.5 	0.9863 	1963 	0.9298 	2.2409 	0.94277 	3.697 	1,108.7
3,000 	508.0 	0.9794 	1879 	0.8962 	2.1751 	0.91512 	3.677 	1,104.0
4,000 	504.4 	0.9725 	1828 	0.8637 	2.1109 	0.88809 	3.657 	1,101.0
5,000 	500.8 	0.9657 	1761 	0.8320 	2.0481 	0.86167 	3.636 	1,097.1
6,000 	497.3 	0.9588 	1696 	0.8014 	1.9868 	0.83586 	3.616 	1,093.2
7,000 	493.7 	0.9519 	1633 	0.7716 	1.9268 	0.81064 	3.596 	1,089.2
8,000 	490.1 	0.9459 	1572 	0.7428 	1.8683 	0.78602 	3.575 	1,085.3
9,000 	486.6 	0.9382 	1513 	0.7148 	1.8111 	0.76196 	3.555 	1,081.4
10,000 	483.0 	0.9313 	1456 	0.6877 	1.7533 	0.73848 	3.534 	1,077.4
11,000 	479.4 	0.9244 	1400 	0.6614 	1.7008 	0.71555 	3.513 	1,073.4
12,000 	475.9 	0.9175 	1345 	0.6360 	1.6476 	0.69317 	3.493 	1,069.4
13,000 	472.3 	0.9107 	1293 	0.6113 	1.5957 	0.67133 	3.472 	1,065.4
14,000 	468.7 	0.9038 	1243 	0.5857 	1.5451 	0.65003 	3.451 	1,061.4
15,000 	465.2 	0.8969 	1194 	0.5643 	1.4956 	0.62924 	3.430 	1,057.3
16,000 	461.6 	0.8900 	1147 	0.5420 	1.4474 	0.60896 	3.409 	1,053.2
17,000 	458.0 	0.8831 	1101 	0.5203 	1.4004 	0.58919 	3.388 	1,049.2
18,000 	454.5 	0.8763 	1057 	0.4994 	1.3546 	0.56991 	3.366 	1,045.1
19,000 	450.9 	0.8694 	1014 	0.4791 	1.3100 	0.55112 	3.345 	1,041.0
20,000 	447.3 	0.8625 	972 	0.4595 	1.2664 	0.53281 	3.324 	1,036.8
21,000 	443.8 	0.8556 	932 	0.4406 	1.2240 	0.51497 	3.302 	1,032.7
22,000 	440.2 	0.8488 	894 	0.4223 	1.1827 	0.49758 	3.281 	1,028.5
23,000 	436.6 	0.8419 	856 	0.4046 	1.1425 	0.48065 	3.259 	1,024.4
24,000 	433.1 	0.8350 	820 	0.3876 	1.1033 	0.46417 	3.238 	1,020.2
25,000 	429.5 	0.8281 	785 	0.3711 	1.0651 	0.44812 	3.216 	1,016.1
26,000 	426.0 	0.8213 	752 	0.3522 	1.0280 	0.43250 	3.194 	1,011.7
(continued)
573

-- 589 of 650 --

Table B1 	U.S. Standard atmosphere in English units (continued)
Altitude Temper-
ature
Temper-
ature
ratio
Pressure 	Pressure
ratio
Density 	Density
ratio
Coefficient
of
viscosity
Speed of
sound
h;ft 	T ; R 	y 	P; psf 	d 	r 	s 	m 	a, ft=s
slugs
ft3
lb  sec
ft2
103 	107
27,000 	422.4 	0.8144 	719 	0.3398 	0.9919 	0.41730 	3.172 	1,007.5
28,000 	418.8 	0.8075 	688 	0.3250 	0.9567 	0.40251 	3.150 	1,003.2
29,000 	415.3 	0.8006 	657 	0.3107 	0.9225 	0.38812 	3.128 	999.0
30,000 	411.7 	0.7938 	628 	0.2970 	0.8893 	3.37413 	3.106 	994.7
31,000 	408.1 	0.7869 	600 	0.2837 	0.8569 	0.36053 	3.084 	990.3
32,000 	404.6 	0.7800 	573 	0.2709 	0.8255 	0.34731 	3.061 	986.0
33,000 	401.0 	0.7731 	547 	0.2586 	0.7950 	0.33447 	3.039 	981.6
34,000 	397.4 	0.7663 	522 	0.2467 	0.7653 	0.32199 	3.016 	977.3
35,000 	393.3 	0.7594 	497 	0.2353 	0.7365 	0.30987 	2.994 	972.9
36,000 	390.3 	0.7525 	474 	0.2243 	0.7086 	0.29811 	2.971 	968.5
36,089 	390.0 	0.7519 	471 	0.2234 	0.7062 	0.29710 	2.969 	968.1
37,000 	390.0 	0.7519 	452 	0.2138 	0.6759 	0.28435 	2.969 	968.1
38,000 	390.0 	0.7519 	431 	0.2038 	0.6442 	0.27101 	2.969 	968.1
39,000 	390.0 	0.7519 	410 	0.1942 	0.6139 	0.25829 	2.969 	968.1
40,000 	390.0 	0.7519 	391 	0.1851 	0.5851 	0.24617 	2.969 	968.1
41,000 	390.0 	0.7519 	373 	0.1764 	0.5577 	0.23462 	2.969 	968.1
42,000 	390.0 	0.7519 	355 	0.1681 	0.5315 	0.22361 	2.969 	968.1
43,000 	390.0 	0.7519 	339 	0.1602 	0.5065 	0.21311 	2.969 	968.1
44,000 	390.0 	0.7519 	323 	0.1527 	0.4828 	0.20311 	2.969 	968.1
45,000 	390.0 	0.7519 	308 	0.1455 	0.4601 	0.19358 	2.969 	968.1
46,000 	390.0 	0.7519 	293 	0.1387 	0.4385 	0.18450 	2.969 	968.1
47,000 	390.0 	0.7519 	279 	0.1322 	0.4180 	0.17584 	2.969 	968.1
48,000 	390.0 	0.7519 	266 	0.1260 	0.3983 	0.16759 	2.969 	968.1
49,000 	390.0 	0.7519 	254 	0.1201 	0.3796 	0.15972 	2.969 	968.1
50,000 	390.0 	0.7519 	242 	0.1145 	0.3618 	0.15223 	2.969 	968.1
51,000 	390.0 	0.7519 	230 	0.1091 	0.3449 	0.14509 	2.969 	968.1
52,000 	390.0 	0.7519 	219 	0.1040 	0.3287 	0.13828 	2.969 	968.1
53,000 	390.0 	0.7519 	209 	0.09909 	0.3133 	0.13179 	2.969 	968.1
54,000 	390.0 	0.7519 	199 	0.09444 	0.2985 	0.12560 	2.969 	968.1
55,000 	390.0 	0.7519 	190 	0.09001 	0.2845 	0.11971 	2.969 	968.1
56,000 	390.0 	0.7519 	181 	0.08578 	0.2712 	0.11409 	2.969 	968.1
57,000 	390.0 	0.7519 	172 	0.08176 	0.2585 	0.10874 	2.969 	968.1
58,000 	390.0 	0.7519 	164 	0.07792 	0.2463 	0.10364 	2.969 	968.1
59,000 	390.0 	0.7519 	156 	0.07426 	0.2348 	0.098772 	2.969 	968.1
60,000 	390.0 	0.7519 	150 	0.07078 	0.2238 	0.094137 	2.969 	968.1
61,000 	390.0 	0.7519 	143 	0.06746 	0.2133 	0.089720 	2.969 	968.1
62,000 	390.0 	0.7519 	136 	0.06429 	0.2032 	0.085509 	2.969 	968.1
63,000 	390.0 	0.7519 	130 	0.06127 	0.1937 	0.081497 	2.969 	968.1
64,000 	390.0 	0.7519 	124 	0.05840 	0.1846 	0.077672 	2.969 	968.1
65,000 	390.0 	0.7519 	118 	0.05566 	0.1760 	0.074027 	2.969 	968.1
574 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 590 of 650 --

Table B2 	U.S. Standard atmosphere in metric units
Altitude Temper-
ature
Temper-
ature
ratio
Pressure 	Pressure
ratio
Density 	Density
ratio
Coefficient
of
viscosity
Speed of
sound
h; m
Geop.
T ;
K
y 	P;
N=m2
d 	r;
Kg=m3
s 	m;
N  sec
m2
a,
m=sec
105
0 	288.2 	1.0000 	101,325 	1.0000 	1.2250 	1.000 	1.789 	340.3
500 	284.9 	0.9888 	95,460 	0.9421 	1.1673 	0.9529 	1.774 	338.4
1,000 	281.7 	0.9775 	89,874 	0.8870 	1.1116 	0.9075 	1.758 	336.4
1,500 	278.4 	0.9662 	84555 	0.8345 	1.0581 	0.8637 	1.742 	334.5
2,000 	275.2 	0.9549 	79495 	0.7846 	1.0065 	0.8216 	1.726 	332.5
2,500 	271.9 	0.9436 	74682 	0.7371 	0.95686 	0.7811 	1.710 	330.6
3,000 	268.7 	0.9324 	70108 	0.6919 	0.90912 	0.7421 	1.694 	328.6
3,500 	265.4 	0.9211 	65764 	0.6490 	0.86323 	0.7047 	1.678 	326.6
4,000 	262.2 	0.9098 	61640 	0.6083 	0.81913 	0.6687 	1.661 	324.6
4,500 	258.9 	0.8985 	57728 	0.5697 	0.77677 	0.6341 	1.645 	332.6
5,000 	255.7 	0.8872 	54019 	0.5331 	0.73612 	0.6009 	1.628 	320.5
5,500 	252.4 	0.8760 	50506 	0.4985 	0.69711 	0.5691 	1.612 	318.5
6,000 	249.2 	0.8647 	47181 	0.4656 	0.65970 	0.5385 	1.595 	316.4
6,500 	245.9 	0.8534 	44034 	0.4346 	0.62384 	0.5093 	1.578 	314.4
7,000 	242.7 	0.8421 	41060 	0.4052 	0.58950 	0.4812 	1.561 	312.4
7,500 	239.4 	0.8390 	38251 	0.3775 	0.55662 	0.4544 	1.544 	310.2
8,000 	236.2 	0.8196 	35599 	0.3513 	0.52517 	0.4287 	1.527 	308.1
8,500 	232.9 	0.8083 	33099 	0.3267 	0.49509 	0.4042 	1.510 	305.9
9,000 	229.7 	0.7970 	30742 	0.3034 	0.46635 	0.3807 	1.492 	303.8
9,500 	226.4 	0.7857 	28523 	0.2815 	0.43890 	0.3583 	1.475 	301.6
10,000 	223.2 	0.7745 	26436 	0.2609 	0.41271 	0.3369 	1.457 	229.5
10,500 	219.9 	0.7632 	24474 	0.2415 	0.38773 	0.3165 	1.439 	297.3
11,000 	216.7 	0.7519 	22632 	0.2234 	0.36392 	0.2971 	1.422 	295.1
11,500 	216.7 	0.7519 	20916 	0.2064 	0.33633 	0.2746 	1.422 	295.1
12,000 	216.7 	0.7519 	19330 	0.1908 	0.31083 	0.2537 	1.422 	295.1
12,500 	216.7 	0.7519 	17864 	0.1763 	0.28726 	0.2345 	1.422 	295.1
13,000 	216.7 	0.7519 	16510 	0.1629 	0.26548 	0.2167 	1.422 	295.1
13,500 	216.7 	0.7519 	15218 	0.1506 	0.24536 	0.2003 	1.422 	295.1
14,000 	216.7 	0.7519 	14101 	0.1392 	0.22675 	0.1851 	1.422 	295.1
14,500 	216.7 	0.7519 	13032 	0.1286 	0.20956 	0.1711 	1.422 	295.1
15,000 	216.7 	0.7519 	12044 	0.1189 	0.19367 	0.1581 	1.422 	295.1
15,500 	216.7 	0.7519 	11131 	0.1099 	0.17899 	0.1461 	1.422 	295.1
16,000 	216.7 	0.7519 	10287 	0.1015 	0.16542 	0.1350 	1.422 	295.1
16,500 	216.7 	0.7519 	9507 	0.09383 	0.15288 	0.1248 	1.422 	295.1
17,000 	216.7 	0.7519 	8787 	0.08672 	0.14129 	0.1153 	1.422 	295.1
17,500 	216.7 	0.7519 	8121 	0.08014 	0.13058 	0.1066 	1.411 	295.1
18,000 	216.7 	0.7519 	7505 	0.07407 	0.12068 	0.09851 	1.422 	295.1
18,500 	216.7 	0.7519 	6936 	0.06845 	0.11153 	0.09104 	1.422 	295.1
19,000 	216.7 	0.7519 	6410 	0.06326 	0.10307 	0.08414 	1.422 	295.1
19,500 	216.7 	0.7519 	5924 	0.05847 	0.09525 	0.07776 	1.422 	295.1
20,000 	216.7 	0.7519 	5475 	0.05403 	0.08803 	0.07187 	1.422 	295.1
PROPERTIES OF THE U.S. STANDARD ATMOSPHERE 	575

-- 591 of 650 --

This page intentionally left blank

-- 592 of 650 --

Appendix C
Airfoil Data
NACA 0006
577

-- 593 of 650 --

NACA 0009
578 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 594 of 650 --

NACA 0012
AIRFOIL DATA 	579

-- 595 of 650 --

NACA 1408
580 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 596 of 650 --

NACA 1412
AIRFOIL DATA 	581

-- 597 of 650 --

NACA 2412
582 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 598 of 650 --

NACA 2415
AIRFOIL DATA 	583

-- 599 of 650 --

NACA 2418
584 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 600 of 650 --

NACA 2421
AIRFOIL DATA 	585

-- 601 of 650 --

NACA 4412
586 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 602 of 650 --

NACA 4415
AIRFOIL DATA 	587

-- 603 of 650 --

NACA 64A210
588 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 604 of 650 --

Appendix D
T-38 Performance Data
Dimensions
Wing
Total Area 	170 ft 2
Span 	25 ft 3 in.
Aspect Ratio 	3.75
Taper Ratio 	0.20
Sweepback (quarter chord) 	24 deg
Airfoil Section 	NACA 65A004.8
Mean Aerodynamic Chord 	92.76 in.
Dihedral 	0 deg
Span=Thickness Ratio 	51.1
Horizontal Tail
Total Area 	59:0 ft 2
Exposed Area 	33:34 ft 2
Aspect Ratio (exposed) 	2.82
Taper Ratio (exposed) 	0.33
Sweepback (quarter chord) 	25 deg
Airfoil Section 	NACA 65A004
Span=Thickness Ratio (exposed) 	58.6
Vertical Tail
Total Area 	41:42 ft 2
Exposed Area 	41:07 ft 2
Apect Ratio (exposed) 	1.21
Taper Ratio (exposed) 	0.25
Sweepback (quarter chord) 	25 deg
Airfoil Section 	NACA 65A004
Span=Thickness Ratio 	42.2
Airplane
Height 	12 ft 11 in.
Length 	43 ft 1 in.
Tread 	10 ft 9 in.
T-38 Powerplant Characteristics
Description
Number 	2
589

-- 605 of 650 --

Model 	J85-GE-5
Manufacturer 	General Electric
Type 	Turbojet
Augmentation 	Afterburning
Compressor 	Axial Flow
Exhaust Nozzle 	Variable Area
Length (overall) 	107.4 in.
Maximum Diameter (afterburner tailpipe) 	20.2 in.
Dry Weight 	477 lb
Fuel Grade 	JP-4
Fuel Specific Weight 	6.2 to 6.9 lb=gal
Ratings1
Power Setting 	Normal 	Military 	Maximum
Power 	Power 	Power
Augmentation 	None 	None 	Afterburner
Engine Speed 2 	96.4 	100 	100
Thrust per engine—lb
No losses 	2140 	2455 	3660
Installed 	1770 	1935 	2840
Specific fuel consumption3
Installed 	1.09 	1.14 	2.64
Operating Limitations
Power Setting 	Normal 	Military 	Maximum
Turbine Discharge
Total Temp (F) 	1050 	1220 	1220
Notes
1 Sea level static ICAO standard conditions with a fuel-specific weight of 6.5 lb=gal.
2 Units are % rpm where 100% ¼ 16,500 rpm.
3 Units are lb=hr per lb thrust.
590 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 606 of 650 --

T-38 PERFORMANCE DATA 	591

-- 607 of 650 --

592 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 608 of 650 --

T-38 PERFORMANCE DATA 	593

-- 609 of 650 --

594 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 610 of 650 --

T-38 PERFORMANCE DATA 	595

-- 611 of 650 --

596 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 612 of 650 --

T-38 PERFORMANCE DATA 	597

-- 613 of 650 --

598 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 614 of 650 --

T-38 PERFORMANCE DATA 	599

-- 615 of 650 --

600 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 616 of 650 --

T-38 PERFORMANCE DATA 	601

-- 617 of 650 --

This page intentionally left blank

-- 618 of 650 --

Appendix E
Selected Laplace Transforms
FðsÞ 	f ðtÞ t > 0
1 	1 	dðtÞ
2 	e  Ts 	dðt  T Þ
3 1
s þ a eat
4 1
ðs þ aÞn
1
ðn  1Þ! t n1eat 	n ¼ 1; 2; 3; . . .
5 1
ðs þ aÞðs þ bÞ
1
b  a ðeat  ebt Þ
6 s
ðs þ aÞðs þ bÞ
1
a  b ðaeat  bebt Þ
7 s þ z
ðs þ aÞðs þ bÞ
1
b  a ½ðz  aÞeat  ðz  bÞebt 
8 1
ðs þ aÞðs þ bÞðs þ cÞ
eat
ðb  aÞðc  aÞ þ ebt
ðc  bÞða  bÞ þ ect
ða  cÞðb  cÞ
9 s þ z
ðs þ aÞðs þ bÞðs þ cÞ
ðz  aÞeat
ðb  aÞðc  aÞ þ ðz  bÞebt
ðc  bÞða  bÞ þ ðz  cÞect
ða  cÞðb  cÞ
10 o
s2 þ o2 	sin ot
11 s
s2 þ o2 	cos ot
12 s þ z
s2 þ o2
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
z2 þ o2
o2
r
sinðot þ fÞ f  tan1ðo=zÞ
13 s sin f þ o cos f
s2 þ o2 	sinðot þ fÞ
14 1
ðs þ aÞ2 þ o2
1
o eat sin ot
15 1
s2 þ 2zon s þ o2
n
1
od
ezon t sin od t 	od  on
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
q
16 s þ a
ðs þ aÞ2 þ o2 	eat cos ot
(continued)
603

-- 619 of 650 --

FðsÞ 	f ðtÞ t > 0
17 s þ z
ðs þ aÞ2 þ o2
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
ðz  aÞ2 þ o2
o2
s
eat sinðot þ fÞ f  tan1 	o
z  a
 	
18 1
s uðtÞ or 1 	unit step
19 1
s eTs 	uðt  T Þ 	delayed step
20 1
s ð1  eTsÞ 	uðtÞ  uðt  T Þ rectangular pulse
21 1
sðs þ aÞ
1
a ð1  eat Þ
22 1
sðs þ aÞðs þ bÞ
1
ab 1  beat
b  a þ aebt
b  a
 	
23 s þ z
sðs þ aÞðs þ bÞ
1
ab z  bðz  aÞeat
b  a þ aðz  bÞebt
b  a
 	
24 1
sðs2 þ o2Þ
1
o2 ð1  cos otÞ
25 s þ z
sðs2 þ o2Þ
z
o2 
ffiffiffiffiffiffiffiffiffiffiffiffiffiffiffiffi
z2 þ o2
o4
r
cosðot þ fÞ f  tan1ðo=zÞ
26 1
sðs2 þ 2zon s þ o2
nÞ
1
o2
n
 1
onod
ezon t sinðod t þ fÞ
od  on
ffiffiffiffiffiffiffiffiffiffiffiffiffi
1  z2
q
f  cos1 z
27 1
sðs þ aÞ2
1
a2 ð1  eat  ateat Þ
28 s þ z
sðs þ aÞ2
1
a2 ½z  zeat þ aða  zÞteat 
29 1
s2 	t 	unit ramp
30 1
s2ðs þ aÞ
1
a2 ðat  1 þ eat Þ
31 1
sn 	n ¼ 1; 2; 3; . . . t n1
ðn  1Þ! 0! ¼ 1
604 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 620 of 650 --

Appendix F
Cramer’s Rule
This appendix will present a brief review of Cramer’s rule for solving
systems of simultaneous equations, such as those encountered with the aircraft
equations of motion. Most engineering mathematics textbooks provide a more
detailed coverage of this subject.
Consider the following set of simultaneous equations:
3x  4y ¼ 6
2x þ 5y ¼ 19
To use Cramer’s rule to solve these equations for x and y, we first recast the
equations in matrix format.
3 	4
2 	5
 	
Coefficient Matrix
x
y
 
¼ 6
19
 	
Input Matrix
We next find the determinant of the coefficient matrix
D ¼ 3 	4
2 	5 ¼ 23
The values of x and y can then be found using
x ¼ D1
D ; y ¼ D2
D
where the determinants D1 and D2 are obtained from the coefficient matrix
with one of the appropriate columns replaced with the input matrix column as
illustrated:
D1 ¼ 6 	4
19 	5 ¼ 46
D2 ¼ 3 	6
2 	19 ¼ 69
605

-- 621 of 650 --

The solution then becomes
x ¼ D1
D ¼ 46
23 ¼ 2
y ¼ D2
D ¼ 69
23 ¼ 3
The same approach is applicable for higher-order sets of simultaneous equa-
tions. In the case of developing transfer functions for the longitudinal and
lateral–directional equations of motion, Cramer’s rule is applied for the case of
three equations and three unknowns. A simplified example of this is presented
2u  a þ 2y ¼ 2de
u þ 10a  3y ¼ 5de
u þ a þ y ¼ 3de
Recasting in matrix form
2 	1 	2
1 	10 	3
1 	1 	1
2
4
3
5 u
a
y
2
4
3
5 ¼
2
5
3
2
4
3
5de
and finding the determinant of the coefficient matrix
2 	1 	2
1 	10 	3
1 	1 	1
¼ 46
The solution then becomes
u ¼
2 	1 	2
5 	10 	3
3 	1 	1
D ¼ 92
46 ¼ 2de
a ¼
2 	2 	2
1 	5 	3
1 	3 	1
D ¼ 0
46 ¼ 0de
y ¼
2 	1 	2
1 	10 	5
1 	1 	3
D ¼ 46
46 ¼ 1de
606 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 622 of 650 --

or, in transfer function form
u
de
¼ 2
a
de
¼ 0
y
de
¼ 1
CRAMER’S RULE 	607

-- 623 of 650 --

This page intentionally left blank

-- 624 of 650 --

Appendix G
Development of Longitudinal and Lateral–
Directional Transfer Functions
Table G.1 	Longitudinal airplane transfer functions
Xde 	Xa 	g cos y1
Zde 	fsðU1  Z_aaÞ  Zag 	fðZq þ U1Þs þ g sin y1g
Mde fM_aas þ Ma þ M Ta g 	ðs2  Mq sÞ
ðs  Xu  X Tu Þ 	Xa 	g cos y1
Z u 	fsðU1  Z_aaÞ  Zag 	fðZq þ U1Þs þ g sin y1g
ðMu þ MTu Þ 	fM_aas þ Ma þ M Ta g 	ðs2  Mq sÞ
¼ uðsÞ
deðsÞ ¼ Nu
D1
DD1 ¼ Es4 þ Fs3 þ Gs2 þ Hs þ I; where:
E ¼ U1  Z_aa
F ¼ ðU1  Z_aaÞðXu þ XTu þ MqÞ  Za  M_aaðU1 þ ZqÞ
G ¼ ðXu þ XT u ÞfMqðU1  Z_aaÞ þ Za þ M_aaðU1 þ Z qÞg þ Mq Za  Zu Xa þ M_aag sin y1 þ
 ðMa þ M Ta ÞðU1 þ ZqÞ
H ¼ g sin y1fMa þ MT u  M_aaðXu þ XT u Þg þ g cos y1fZ u M_aa þ ðMu þ MTu ÞðU1  Z_aaÞg
þ ðMu þ M Tu ÞfXaðU1 þ ZqÞg þ Z u XaM q
þ ðXu þ XT u ÞfðMa þ M Tu ÞðU1 þ Z qÞ  Mq Zag
I ¼ g cos y1fðMa þ M Ta ÞZu  ZaðMu þ MTu Þg
þ g sin y1fM u þ MT u ÞXa  ðXu þ X Tu ÞðMa þ M Ta Þg
N u ¼ A u s3 þ B u s2 þ Cu s þ Du; where:
A u ¼ Xde ðU1  Z_aaÞ
B u ¼ XdE fðU1  Z_aaÞM q þ Za þ M_aaðU1 þ ZqÞg þ Zde Xa
C u ¼ Xde fMq Za þ M_aag sin y1  ðMaMTa ÞðU1 þ ZqÞg
þ Zde fM_aag cos y1  XaMqg þ Mde fXaðU1 þ ZqÞ  ðU1  Z_aaÞg cos y1g
D u ¼ Xde ðMa þ M Ta Þg sin y1  Zde Mag cos y1Mde ðZag cos y1  Xag sin y1Þ
ðs  Xu  X Tu Þ 	Xde 	g cos y1
Z u 	Zde 	fðZq þ U1Þs þ g sin y1g
ðMu þ MTu Þ 	Mde 	ðs2  Mq sÞ
DD1
¼ aðsÞ
deðsÞ ¼ Na
D1
609

-- 625 of 650 --

Na ¼ Aas3 þ Bas2 þ Cas þ Da; where:
Aa ¼ Zde
Ba ¼ Xde Zu þ Zde fMq  ðX u þ X Tu Þg þ Mde ðU1 þ Z qÞ
Ca ¼ Xde fðU1 þ ZqÞðMu þ M Tu Þ  Mq Zug þ Zde M qðX u þ X Tu Þ
þ Mde fg sin y1  ðU1 þ Z qÞðX u þ X Tu Þg
Da ¼ Xde ðMu þ M Tu Þg sin y1 þ Zde ðMu þ MTu Þg cos y1
þ Mde fðX u þ X Tu Þg sin y1  Zu g cos y1g
yðsÞ
deðsÞ ¼
ðs  X u  X Tu Þ 	Xa 	Xde
Zu 	fsðU1  Z_aaÞ  Zag 	Zde
ðM u þ MT u Þ 	fM_aas þ Ma þ MTa g Mde
DD1
¼ Ny
DD1
Ny ¼ Ays2 þ Bys þ Cy; where
Ay ¼ Zde M_aa þ Mde ðU1  Z_aaÞ
By ¼ Xde fZu M_aa þ ðU1  Z_aaÞðM u þ MT u Þg þ Zde fðMa þ MTa Þ  M_aaðX u þ X Tu Þg
þ Mde fZa  ðU1  Z_aaÞðXu þ XT u Þg
Cy ¼ Xde fðMa þ M Tu ÞZu  ZaðMu þ Mtu Þg
þ Zde fðMa þ MTu ÞðXu þ XTu Þ þ XaðMu þ M Tu Þg þ Mde fZaðXu þ XTu Þ  XaZug
Table G.2 	Lateral–directional airplane transfer functions
bðsÞ
dðsÞ ¼
Yd 	ðsY p þ g cos y1Þ 	sðU1  Yr Þ
Ld 	ðs2  L p sÞ 	ðs2 AA1 þ sLr Þ
Nd 	ðs2 BB1 þ Np sÞ 	ðs2  sNr Þ
ðsU1  YbÞ 	ðsYp þ g cos y1Þ 	sðU1  Yr Þ
Lb 	ðs2  L p sÞ 	ðs2A1 þ sLr Þ
ðNb þ NTb Þ 	ðs2 BB1 þ N p sÞ 	ðs2  sN r Þ
¼ Nb
DD2
DD2 ¼ sðE0s4 þ F0s3 þ G0s2 þ H0s þ I 0 Þ
E0 ¼ U1ð1  AA1 BB1Þ
F0 ¼ Yb  ð1  AA1 BB1Þ  U1ðLp þ N r þ AA1Np þ BB1Lr Þ
G0 ¼ U1ðLp N r  Lr NpÞ þ YbðNr þ L p þ AA1Np þ BB1Lr Þ  Y pðLb þ Nb AA1 þ NTb
AA1Þ
þ U1ðLb BB1 þ Nb þ N Tb Þ  Yr ðLb BB1 þ Nb þ NTb Þ
H0 ¼ YbðLp N r  Lr NpÞ þ Y pðLbNr  NbLr  N Tb L r Þ  g cos y1ðLb þ Nb AA1 þ N Tb
AA1Þ
þ U1ðLbN p  NbLp  N Tb L pÞ  Yr ðLbNp  NbL p  NTb LpÞ
I 0 ¼ g cos y1ðLbNr  NbLr  N Tb Lr Þ
610 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 626 of 650 --

Nb ¼ sðAbs3 þ Bbs2 þ Cbs þ DbÞ; where:
Ab ¼ Ydð1  AA1 BB1Þ
Bb ¼ YdðNr þ L p þ AA1Np þ BB1L r Þ þ Y pðLd þ Nd AA1Þ þ Y r ðLd BB1 þ NdÞ þ
 U1ðLd BB1 þ NdÞ
Cb ¼ YdðLp Nr  Np Lr Þ þ Y pðNdLr  LdN r Þ þ g cos y1ðLd þ Nd AA1Þ þ Yr ðLdNp  NdLpÞ þ
 U1ðLdN p  NdLpÞ
Db ¼ g cos y1ðNdLr  LdN r Þ
fðsÞ
dðsÞ ¼
ðsU1  YbÞ 	Yd 	sðU1  Yr Þ
Lb 	Ld 	ðs2A1 þ sLr Þ
ðNb þ N Tb Þ Nd 	ðs2  sNr Þ
DD2
¼ Nf
DD2
Nf ¼ sðAfs2 þ Bfs þ CfÞ; where :
Af ¼ U1ðLd þ NdA1Þ
Bf ¼ U1ðNdL r  LdN r Þ  YbðLd þ Nd AA1Þ þ YdðLb þ Nb AA1 þ NTb
AA1Þ
Cf ¼ YbðNdL r  LdNr Þ þ YdðL r Nb þ L r N Tb  Nr LbÞ
þ ðU1  Yr ÞðNbLd þ N Tb Ld  LbNdÞ
cðsÞ
dðsÞ ¼
ðsU1  YbÞ 	ðsYp þ g cos y1Þ 	Yd
Lb 	ðs2  Lp sÞ 	Ld
ðNb þ N Tb Þ 	ðs2 BB1 þ N p sÞ 	Nd
DD2
¼ Nc
DD2
Nc ¼ ðAcs3 þ Bcs2 þ Ccs þ DcÞ; where:
Ac ¼ U1ðNd þ Ld BB1Þ
Bc ¼ U1ðLdNp  NdLpÞ  YbðNd þ Ld BB1Þ þ YdðLb BB1 þ Nb þ NTb Þ
Cc ¼ YbðLdN p  NdLpÞ þ YpðNbLd þ N Tb Ld  LbNdÞ
þ YdðLbN p  NbLp  N Tb L pÞ
Dc ¼ g cos y1ðNbLd þ NTb Ld  LbNdÞ
DIRECTIONAL TRANSFER FUNCTIONS 	611

-- 627 of 650 --

This page intentionally left blank

-- 628 of 650 --

Appendix H
Stability Characteristics of Selected Aircraft
Lockheed C-5A
Aircraft 	C-5A 	C-5A 	C-5A
Parameter
Altitude (ft) 	S.L. 	20,000 	40,000
Mach 	0.25 	0.7 	0.7
True Airspeed (ft=s) 	279 	725 	678
Dyn Pressure (lb=ft 2 )
Weight (lb) 	728,000 	728,000 	728,000
Wing Area—S—ðft 2Þ 	6,200 	6,200 	6,200
Wing Span—b—(ft) 	219.17 	219.17 	219.17
Wing Chord—cc—(ft) 	30.93 	30.93 	30.93
C.G. (x cc) 	0.25 	0.25 	0.25
Trim AOA (deg) 	11.41 	0.68 	7.66
Ixx S ðslug  ft 2Þ 	3:25  107 	3:23  107 	3:22  107
I yy S ðslug  ft 2Þ 	3:28  107 	3:28  107 	3:28  107
I zzS ðslug  ft 2Þ 	6:15  107 	6:18  107 	6:19  107
I xz S ðslug  ft 2Þ 	3:34  106 	2:2  106 	1:42  106
Longitudinal Derivatives
Xu ð1=sÞ 	0.0111 	0.00283 	0.00339
Xa ðft=s 2Þ 	5.58 	19.1 	8.43
Zu ð1=sÞ 	0.107 	0.042 	0.06
Za ðft=s 2Þ 	124 	450 	204
M u ð1=ft  sÞ 	0.00007 	0.00004 	0.00005
Ma ð1=s 2Þ 	0.76 	2.2 	1.07
M_aa ð1=sÞ 	0.169 	0.21 	0.113
M q ð1=sÞ 	0.67 	0.898 	0.426
Xde ðft=s 2Þ 	0 	0 	0
Zde ðft=s 2Þ 	11.5 	27.7 	13.2
Mde ð1=s2Þ 	1.049 	2.48 	1.17
Lat-Dir Derivatives
Yb ðft=s 2Þ 	21.2 	73.2 	29.4
Lb ð1=sÞ2 	0.585 	1.516 	0.752
Lp ð1=sÞ 	0.329 	0.432 	0.217
Lr ð1=sÞ 	0.256 	0.181 	0.125
Nb ð1=s 2Þ 	0.167 	0.449 	0.200
Np ð1=sÞ 	0.0184 	0.0248 	0.0151
Nr ð1=sÞ 	0.12 	0.158 	0.07
Ydr ðft=s 2Þ 	4.64 	16.7 	6.70
613

-- 629 of 650 --

Ldr ð1=s 2Þ 	0.00974 	0.168 	0.0533
Ndr ð1=s 2Þ 	0.141 	0.504 	0.203
Yda ðft=s 2Þ 	0 	0 	0
Lda ð1=s2Þ 	0.264 	0.389 	0.304
Nda ð1=s 2Þ 	0.0138 	0 	0
Boeing 747
Aircraft 	747 	747 	747
Parameter
Altitude (ft) 	S.L. 	20,000 	40,000
Mach 	0.198 	0.650 	0.900
True Airspeed (ft=s) 	221 	673 	871
Dyn Pressure (lb=ft 2 ) 	58.0 	287.2 	222.8
Weight (lb) 	564,000 	636,636 	636,636
Wing Area—S—ðft 2Þ 	5,500 	5,500 	5,500
Wing Span—b—(ft) 	196 	196 	196
Wing Chord—cc—(ft) 	27.3 	27.3 	27.3
C.G. (x cc) 	0.25 	0.25 	0.25
Trim AOA (deg) 	8.5 	2.5 	2.4
Ixx S ðslug  ft 2Þ 	1:41  107 	1:82  107 	1:82  107
I yy S ðslug  ft 2Þ 	3:05  107 	3:31  107 	3:31  107
I zzS ðslug  ft 2Þ 	4:27  107 	4:97  107 	4:97  107
I xz S ðslug  ft 2Þ 	3:49  106 	4:05  105 	3:50  105
Longitudinal Derivatives
Xu ð1=sÞ 	0.0433 	0.0059 	0.0218
Xa ðft=s 2Þ 	11.4738 	15.9787 	1.2227
Zu ð1=sÞ 	0.2720 	0.1104 	0.0569
Za ðft=s 2Þ 	108.0542 	353.52 	339.0036
Mu ð1=ft  sÞ 	0.0001 	0.0000 	0.0001
Ma ð1=s 2Þ 	0.4140 	1.3028 	1.6165
M_aa ð1=sÞ 	0.0582 	0.1057 	0.1425
Mq ð1=sÞ 	0.3774 	0.5417 	0.4038
Xde ðft=s 2Þ 	0.0000 	0.0000 	0.0000
Zde ðft=s 2Þ 	6.5565 	25.5659 	18.3410
Mde ð1=s2Þ 	0.3997 	1.6937 	1.2124
Lat-Dir Derivatives
Yb ðft=s 2Þ 	19.6694 	71.9142 	55.7808
Lb ð1=s 2Þ 	1.2461 	2.7255 	1.2555
Lp ð1=sÞ 	0.9871 	0.8434 	0.4758
Lr ð1=sÞ 	0.3834 	0.3224 	0.2974
Nb ð1=s 2Þ 	0.2694 	0.9962 	1.0143
Np ð1=sÞ 	0.1441 	0.0236 	0.0109
Nr ð1=sÞ 	0.2338 	0.2539 	0.1793
Ydr ðft=sÞ2 	3.2600 	9.5872 	3.7187
614 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 630 of 650 --

Ldr ð1=s 2Þ 	0.0000 	0.1363 	0.2974
Ndr ð1=s 2Þ 	0.1655 	0.6226 	0.4589
Yda ðft=s 2Þ 	0.0000 	1.0386 	0.0000
Lda ð1=s2Þ 	0.2350 	0.2214 	0.1850
Nda ð1=s 2Þ 	0.0122 	0.0112 	0.0135
McDonnell Douglass DC-8
Aircraft 	DC-8 	DC-8 	DC-8
Parameter
Assume aL¼0 ¼ 2
Altitude (ft) 	S=L 	15,000 	33,000
Mach 	0.218 	0.443 	0.88
True Airspeed (ft=s) 	243 	468 	868
Dyn Pressure (lb=ft 2 ) 	70.4 	164 	300
Weight (lb) 	190,000 	190,000 	230,000
Wing Area—S—(ft 2 ) 	2,600.0 	2,600.0 	2,600.0
Wing Span—b—(ft) 	142.3 	142.3 	142.3
Wing Chord—cc—(ft) 	23.0 	23.0 	23.0
C.G. (x cc) 	0.15 	0.15 	0.15
Trim AOA (deg) 	10.36 	3.23 	0.45
I xx S ðslug  ft 2Þ 	3:16  106 	3:13  10 6 	3:77  106
I yy S ðslug  ft 2Þ 	2:94  106 	2:94  10 6 	3:56  106
I zzS ðslug  ft 2Þ 	5:51  106 	5:86  10 6 	7:13  106
I xz S ðslug  ft 2Þ 	4:14  105 	2:20  10 5 	2:73  105
Longitudinal Derivatives
Xu ð1=sÞ 	0.0291 	0.0071 	0.0463
Xa ðft=s 2Þ 	15.32 	15.03 	22.36
Zu ð1=sÞ 	0.251 	0.133 	0.062
Za ðft=s 2Þ 	152.8 	354 	746.9
M u ð1=ft  sÞ 	0.0000 	0.0000 	0.0025
Ma ð1=s 2Þ 	2.118 	5.010 	12.003
M_aa ð1=sÞ 	0.260 	0.337 	0.449
M q ð1=sÞ 	0.792 	0.991 	1.008
Xde ðft=s 2Þ 	0.0 	0.0 	0.0
Zde ðft=s 2Þ 	10.17 	23.70 	39.06
Mde ð1=s2Þ 	1.351 	3.241 	5.120
Lat-Dir Derivatives
Yb ðft=s 2Þ 	27.05 	47.19 	81.28
Lb ð1=s 2Þ 	1.334 	2.684 	5.111
Lp ð1=sÞ 	0.949 	1.234 	1.299
Lr ð1=sÞ 	0.611 	0.391 	0.352
Nb ð1=s 2Þ 	0.762 	1.272 	2.497
Np ð1=sÞ 	0.119 	0.048 	0.008
Nr ð1=sÞ 	0.268 	0.253 	0.254
STABILITY CHARACTERISTICS OF SELECTED AIRCRAFT 615

-- 631 of 650 --

Ydr ðft=sÞ2 	5.782 	13.47 	20.35
Ldr ð1=s 2Þ 	0.185 	0.375 	0.639
Ndr ð1=s 2Þ 	0.389 	0.861 	1.298
Yda ðft=s 2Þ 	0.0 	0.0 	0.0
Lda ð1=s2Þ 	0.725 	1.622 	2.329
Nda ð1=s 2Þ 	0.050 	0.036 	0.062
Learjet C-21
Aircraft 	C-21 	C-21 	C-21
Parameter
Altitude (ft) 	S=L 	40,000 	40,000
Mach 	0.152 	0.7 	0.7
True Airspeed (ft=s) 	170 	677 	677
Dyn Pressure (lb=ft 2 ) 	34.3 	134.6 	134.6
Weight (lb) 	13,000 	13,000 	9,000
Wing Area—S—(ft 2 ) 	230 	230 	230
Wing Span—b—(ft) 	34.0 	34.0 	34.0
Wing Chord—cc—(ft) 	7.0 	7.0 	7.0
C.G. (x cc) 	0.32 	0.32 	0.32
Trim AOA (deg) 	5.0 	2.7 	1.5
I xx S ðslug  ft 2Þ 	2:79  104 	2:79  104 	5:94  103
I yy S ðslug  ft 2Þ 	1:88  104 	1:88  104 	1:78  104
I zzS ðslug  ft 2Þ 	4:71  104 	4:71  104 	2:51  104
I xz S ðslug  ft 2Þ 	3:60  102 	4:03  102 	9:02  102
Longitudinal Derivatives
Xu ð1=sÞ 	0.0589 	0.0194 	0.0261
Xa ðft=s 2Þ 	11.3335 	8.4349 	6.6457
Zu ð1=sÞ 	0.3816 	0.1382 	0.1374
Za ðft=s 2Þ 	103.4862 	450.3834 	649.9336
M u ð1=ft  sÞ 	0.0002 	0.0009 	0.0013
Ma ð1=s 2Þ 	1.9387 	7.3772 	7.7917
M_aa ð1=sÞ 	0.3024 	0.3993 	0.4217
M q ð1=sÞ 	0.8164 	0.9237 	0.9756
Xde ðft=s 2Þ 	0.0000 	0.0000 	0.0000
Zde ðft=s 2Þ 	7.8162 	35.2731 	50.9500
Mde ð1=s2Þ 	2.8786 	14.2934 	15.0964
Lat-Dir Derivatives
Yb ðft=s 2Þ 	14.2645 	55.9768 	80.8554
Lb ð1=s 2Þ 	1.6621 	4.1470 	17.7208
Lp ð1=sÞ 	0.3747 	0.4260 	2.0024
Lr ð1=sÞ 	0.4323 	0.1515 	0.6230
616 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 632 of 650 --

Nb ð1=s 2Þ 	0.8546 	2.8393 	5.2082
Np ð1=sÞ 	0.0741 	0.0045 	0.0232
Nr ð1=sÞ 	0.1481 	0.1123 	0.2109
Ydr ðft=sÞ2 	2.7357 	10.7353 	15.5065
Ldr ð1=s 2Þ 	0.1345 	0.7163 	3.7214
Ndr ð1=s 2Þ 	0.4216 	1.6544 	3.1081
Yda ðft=s 2Þ 	0.0000 	0.0000 	0.0000
Lda ð1=s2Þ 	1.4315 	6.7106 	31.5431
Nda ð1=s 2Þ 	0.2849 	0.4471 	0.8400
Lockheed F-104
Aircraft 	F-104 	F-104
Parameter
Altitude (ft) 	S=L 	55,000
Mach 	0.257 	1.800
True Airspeed (ft=s) 	287 	1,742
Dyn Pressure (lb=ft 2 ) 	97.8 	434.5
Weight (lb) 	16,300 	16,300
Wing Area—S—(ft2 ) 	196 	196
Wing Span—b—(ft) 	21.9 	21.9
Wing Chord—cc—(ft) 	9.6 	9.6
C.G. (x cc) 	0.07 	0.07
Trim AOA (deg) 	10 	2
Ixx S ðslug  ft 2Þ 	5:30  103 	3:67  103
I yy S ðslug  ft 2Þ 	5:90  104 	5:90  104
I zzS ðslug  ft 2Þ 	5:83  104 	5:99  104
I xz S ðslug  ft 2Þ 	9:64  103 	1:97  103
Longitudinal Derivatives
Xu ð1=sÞ 	0.0695 	0.0049
Xa ðft=s 2Þ 	14.9575 	32.4692
Zu ð1=sÞ 	0.2243 	0.0176
Za ðft=s 2Þ 	140.2374 	346.6128
M u ð1=ft  sÞ 	0.0000 	0.0000
Ma ð1=s 2Þ 	2.0086 	18.1248
M_aa ð1=sÞ 	0.0855 	0.0783
M q ð1=sÞ 	0.3046 	0.1844
Xde ðft=s 2Þ 	0.0000 	0.0000
Zde ðft=s 2Þ 	25.9012 	87.9865
Mde ð1=s2Þ 	4.9904 	18.1525
Lat-Dir Derivatives
Yb ðft=s 2Þ 	44.6833 	175.8047
Lb ð1=s 2Þ 	13.8595 	47.2783
Lp ð1=sÞ 	0.8612 	0.8692
STABILITY CHARACTERISTICS OF SELECTED AIRCRAFT 617

-- 633 of 650 --

Lr ð1=sÞ 	0.8007 	0.4921
Nb ð1=s 2Þ 	3.6508 	7.5310
Np ð1=sÞ 	0.0396 	0.0182
Nr ð1=sÞ 	0.2069 	0.1270
Ydr ðft=sÞ2 	12.4583 	14.6364
Ldr ð1=s 2Þ 	3.5480 	4.0161
Ndr ð1=s 2Þ 	1.1845 	1.3537
Yda ðft=s 2Þ 	0.0000 	0.0000
Lda ð1=s2Þ 	3.1045 	8.7948
Nda ð1=s 2Þ 	0.0302 	0.0778
McDonnell Douglass F-4C
Aircraft 	F-4C 	F-4C 	F-4C
Parameter
Altitude (ft) 	S=L 	35,000 	35,000
Mach 	0.8 	0.6 	1.2
True Airspeed (ft=s) 	893 	584 	1,167
Dyn Pressure (lb=ft2 ) 	948 	126 	503
Weight (lb) 	38924 	38924 	38924
Wing Area—S—(ft2 ) 	530 	530 	530
Wing Span—b—(ft) 	38.67 	38.67 	38.67
Wing Chord—cc—(ft) 	16.0 	16.0 	16.0
C.G. (x cc) 	0.289 	0.289 	0.289
Trim AOA (deg) 	0.3 	9.4 	1.6
Ixx S ðslug  ft 2Þ 	2:50  104 	3:56  104 	2:51  104
I yy S ðslug  ft 2Þ 	1:22  105 	1:22  105 	1:22  105
I zzS ðslug  ft 2Þ 	1:40  105 	1:29  105 	1:40  105
I xz S ðslug  ft 2Þ 	9:75  102 	3:37  104 	4:23  103
Longitudinal Derivatives
Xu ð1=sÞ 	0.0162 	0.0176 	0.0136
Xa ðft=s 2Þ 	0.820 	24.25 	16.53
Zu ð1=sÞ 	0.073 	0.116 	0.010
Za ðft=s 2Þ 	1374.9 	162.2 	848.3
M u ð1=ft  sÞ 	0.0017 	0.0001 	0.0022
Ma ð1=s 2Þ 	17.76 	1.927 	29.03
M_aa ð1=sÞ 	0.592 	0.144 	0.288
M q ð1=sÞ 	1.360 	0.307 	0.746
Xde ðft=s 2Þ 	0.00 	0.01 	0.01
Zde ðft=s 2Þ 	141.0 	20.98 	90.44
Mde ð1=s2Þ 	32.30 	4.90 	20.70
Lat-Dir Derivatives
Yb ðft=s 2Þ 	299.2 	33.05 	176.2
Lb ð1=s 2Þ 	27.21 	8.252 	13.23
618 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 634 of 650 --

Lp ð1=sÞ 	3.034 	0.687 	1.372
Lr ð1=sÞ 	0.876 	0.281 	0.329
Nb ð1=s 2Þ 	16.03 	2.155 	12.59
Np ð1=sÞ 	0.009 	0.006 	0.021
Nr ð1=sÞ 	0.753 	0.149 	0.403
Ydr ðft=sÞ2 	39.47 	6.600 	15.40
Ldr ð1=s 2Þ 	7.774 	0.346 	2.765
Ndr ð1=s 2Þ 	7.920 	1.403 	3.251
Yda ðft=s 2Þ 	6.644 	0.882 	3.524
Lda ð1=s2Þ 	22.15 	4.243 	10.93
Nda ð1=s 2Þ 	0.556 	0.124 	0.443
LTV Corsair A-7A
Aircraft 	A-7A 	A-7A 	A-7A
Parameter
Altitude (ft) 	S=L 	35,000 	35,000
Mach 	0.6 	0.6 	0.9
True Airspeed (ft=s) 	670 	584 	876
Dyn Pressure (lb=ft 2 ) 	534 	126 	283
Weight (lb) 	21,889 	21,889 	21,889
Wing Area—S—(ft2 ) 	375 	375 	375
Wing Span—b—(ft) 	38.7 	38.7 	38.7
Wing Chord—cc—(ft) 	10.8 	10.8 	10.8
C.G. (x cc) 	0.30 	0.30 	0.30
Trim AOA (deg) 	2.9 	7.5 	3.8
Ixx S ðslug  ft 2Þ 	1:36  104 	1:58  104 	1:38  104
I yy S ðslug  ft 2Þ 	5:90  104 	5:90  104 	5:90  104
I zzS ðslug  ft 2Þ 	6:76  104 	6:54  104 	6:74  104
I xz S ðslug  ft 2Þ 	2:55  103 	1:10  104 	4:24  103
Longitudinal Derivatives
Xu ð1=sÞ 	0.0156 	0.0093 	0.0230
Xa ðft=s 2Þ 	26.58 	33.35 	29.74
Zu ð1=sÞ 	0.124 	0.112 	0.091
Za ðft=s 2Þ 	1284.0 	316.1 	881.3
Mu ð1=ft  sÞ 	0.0002 	0.0002 	0.0026
Ma ð1=s 2Þ 	15.57 	4.183 	13.02
M_aa ð1=sÞ 	0.207 	0.065 	0.143
Mq ð1=sÞ 	1.110 	0.330 	0.539
Xde ðft=s 2Þ 	0.02 	0.01 	0.01
Zde ðft=s 2Þ 	165.2 	43.57 	99.62
Mde ð1=s2Þ 	30.60 	8.19 	20.20
Lat-Dir Derivatives
Yb ðft=s 2Þ 	210.4 	49.46 	127.0
Lb ð1=s 2Þ 	44.57 	13.60 	29.89
STABILITY CHARACTERISTICS OF SELECTED AIRCRAFT 619

-- 635 of 650 --

Lp ð1=sÞ 	4.401 	1.295 	2.956
Lr ð1=sÞ 	1.341 	0.639 	0.705
Nb ð1=s 2Þ 	8.126 	2.416 	6.444
Np ð1=sÞ 	0.022 	0.020 	0.026
Nr ð1=sÞ 	0.968 	0.288 	0.490
Ydr ðft=sÞ2 	51.52 	15.59 	30.39
Ldr ð1=s 2Þ 	11.08 	1.854 	5.927
Ndr ð1=s 2Þ 	9.207 	2.754 	5.473
Yda ðft=s 2Þ 	7.034 	1.559 	3.740
Lda ð1=s2Þ 	28.46 	7.859 	14.24
Nda ð1=s 2Þ 	0.559 	0.098 	0.205
Cessna T-37
Aircraft 	T-37 	T-37 	T-37
Parameter
Altitude (ft) 	S=L 	30,000 	S=L
Mach 	0.313 	0.459 	0.143
True Airspeed (ft=s) 	349 	456 	160
Dyn Pressure (lb=ft 2 ) 	144.9 	92.7 	30.4
Weight (lb) 	6,360 	6,360 	6,360
Wing Area—S—(ft2 ) 	182 	182 	182
Wing Span—b—(ft) 	33.8 	33.8 	33.8
Wing Chord—cc—(ft) 	5.47 	5.47 	5.47
C.G. (x cc) 	27.0 	27.0 	27.0
Trim AOA (deg) 	0.7 	2 	4.2
Ixx S ðslug  ft 2Þ 	7:99  103 	7:99  103 	8:00  103
I yy S ðslug  ft 2Þ 	3:33  103 	3:33  103 	3:33  103
I zzS ðslug  ft 2Þ 	1:12  104 	1:12  104 	1:12  104
I xz S ðslug  ft 2Þ 	3:91  101 	1:12  102 	2:34  102
Longitudinal Derivatives
Xu ð1=sÞ 	0.0168 	0.0112 	0.0553
Xa ðft=s 2Þ 	14.8205 	10.9335 	13.1096
Zu ð1=sÞ 	0.1844 	0.1416 	0.4027
Za ðft=s 2Þ 	645.1571 	442.4657 	134.4015
Mu ð1=ft  sÞ 	0.0000 	0.0000 	0.0000
Ma ð1=s 2Þ 	28.9722 	19.4229 	5.7417
M_aa ð1=sÞ 	2.2569 	1.1566 	1.0639
Mq ð1=sÞ 	4.8604 	2.4797 	2.1776
Xde ðft=s 2Þ 	0.0000 	0.0000 	0.0000
Zde ðft=s 2Þ 	53.4070 	42.7090 	11.2048
Mde ð1=s2Þ 	46.4075 	31.0767 	9.5543
Lat-Dir Derivatives
Yb ðft=s 2Þ 	48.1999 	29.5547 	8.4876
Lb ð1=s 2Þ 	9.4992 	6.7383 	1.9210
620 	INTRODUCTION TO AIRCRAFT FLIGHT MECHANICS

-- 636 of 650 --

Lp ð1=sÞ 	2.3783 	1.1693 	1.1305
Lr ð1=sÞ 	0.3189 	0.2450 	0.6270
Nb ð1=s 2Þ 	8.3856 	5.6418 	1.8339
Np ð1=sÞ 	0.0594 	0.0459 	0.1359
Nr ð1=sÞ 	0.5531 	0.2628 	0.2853
Ydr ðft=sÞ2 	26.7035 	17.0836 	5.6024
Ldr ð1=s 2Þ 	1.6744 	1.0707 	0.3505
Ndr ð1=s 2Þ 	2.9094 	1.8619 	0.6113
Yda ðft=s 2Þ 	0.0000 	0.0000 	00.000
Lda ð1=s2Þ 	19.9583 	12.9199 	4.1785
Nda ð1=s 2Þ 	1.2754 	1.2957 	1.2729
STABILITY CHARACTERISTICS OF SELECTED AIRCRAFT 621

-- 637 of 650 --

This page intentionally left blank

-- 638 of 650 --

Bibliography
Blake, W. B., Air Force Research Laboratory, Flight Vehicles Directorate, private
communication, Jan. 2002.
Bossert, D., and Cohen, K., ‘‘Design of Fuzzy Pitch Attitude Hold Systems for a Fighter
Jet,’’ Proceedings of the 2001 AIAA Guidance, Navigation, and Control Conference.
Bowman, J. S., Jr., Hultberg, R. S., and Martin, C. A., ‘‘Measurements of Pressures on
the Tail and Aft Fuselage of an Airplane Model During Rotary Motions at Spin Attitudes,’’
NASA TP-2939, Nov. 1989.
Brandt, S. A., Stiles, R. J., Bertin, J. J., and Whitford, R., Introduction to Aeronautics: A
Design Perspective, AIAA Education Series, AIAA, Reston, VA, 1997.
D’Azzo, J., and Houpis, C., Linear Control System Analysis and Design, Conventional
and Modern, McGraw-Hill, New York, 1988.
DiStefano, J., Stubberud, A., and Williams, I., Feedback and Control Systems, Schaum’s
Outline Series, McGraw-Hill, New York, 1967.
Houpis, C., and Lamont, G., Digital Control Systems: Theory, Hardware, Software,
McGraw-Hill, New York, 1985.
Hultberg, R., ‘‘Low Speed Rotary Aerodynamic of F-18 Configuration for 0 to 90 Angle
of Attack—Test Results and Analysis,’’ NASA CR-3608, Aug. 1984.
Mattingly, J. D., Elements of Gas Turbine Propulsion, McGraw-Hill, New York, 1996.
Mattingly, J. D., Heiser, W. H., and Daley, D. H., Aircraft Engine Design, AIAA
Education Series, AIAA, Reston, VA, 1987.
Nelson, R. C., Flight Stability and Automatic Control, McGraw-Hill, New York, 1989.
Ralston, J. N., ‘‘Rotary Balance Data and Analysis for the X-29A Airplane for an Angle-
of-Attack Range of 0 to 90,’’ NASA CR-3747, Aug. 1984.
Roskam, J., Airplane Flight Dynamics and Automatic Flight Controls, Part I and II,
Design, Analysis, and Research Corporation, Lawrence, KS, 1995.
USAF Test Pilot School, Feedback Control Theory, Edwards AFB, CA, 1988, Chaps.
13, 14.
623

-- 639 of 650 --

This page intentionally left blank

-- 640 of 650 --

Index
A-10A Prototype flight evaluation, 377–380
A-7D DIGITAC Multimode Flight Control
System Program, 463–469
AC-130H drag reduction effort, 53–55
Aerodynamic center, 33–34
Aerodynamic forces, 15–16
Aerodynamics
Airfoil fundamentals, 15–42
basic review, 1–56
Bernoulli’s equation, 8–11
boundary layer, 19–29
continuity equation, 6–7
drag polar, 50–52
equation of state for perfect gas, 4
finite wings, 42–47
flowfield properties, 1–12
hydrostatic equation, 4–6
incompressible and compressible flow, 7–8
load factor, 48–50
Mach number, 11–13
one-dimensional flow, 6–7
pitching moment, 185–190
point properties, 2–4
pressure, temperature, and density altitudes,
14–15
Reynolds number computation, 21–29
speed of sound, 11
stall airspeed, 48–50
standard atmosphere, 13–15
steady flow assumption, 2–4
streamline, definition, 3
total aircraft drag, 52–53
viscous flow, definition, 17–18
Aileron control power, 210–212, see
derivatives, primary control
Aircraft class, 356
Aircraft drag, 178–180
Aircraft lift, 180–184
Aircraft stability characteristics, 613–621
Airfoil data, 34–38
Airfoil fundamentals, 15–42
Airfoils
Aerodynamic center, 33–34
Airfoil data, 34–38
boundary layer, 19–29
center of pressure, 33–34
data graphs, NACA, 577–588
definitions and terminology, 29–34
drag, 17–29
drag polar, 35
lift, 16–17
lift, drag, and moment coefficients, 31–33
Mach effects, 38–42
pressure drag, 26–28
profile drag, 28–29
relative motion, 15–16
Reynolds number, 21–29
source of aerodynamic forces, 15–16
Airspeed, 79–85
Angle of attack feedback, 442–443
Applied aero forces and moments, first-order
approximation, 244–279
Approach, flare, ground roll, 100–102
Autopilot=navigation control systems, 444–
451
Average acceleration method, 93–96
Average value endurance equation, 114
Average value range equation, 118–119
Bernoulli’s equation, 8–11
Bode plots and stability, 497–544
Body axis system and transformation, 145–163
Boundary layer in airfoils, 19–29
Breguet endurance equation, 114–116
Breguet range equation, 119–124
C-1 autopilot, 427–428
Center of pressure, 33–34
Climb performance, 108–110
Closed-loop analysis of second-order system,
394–399
Closed-loop feedback control systems,
392–403
Closed-loop systems, 392–394
Closed-loop transfer functions, 399–403
Combined systems, 457–463
Compensation devices, 523–544
Compensation filters, 451–457
Constant density flow, see incompressible and
compressible flow
Continuity equation, 6–7
Control augmentation systems, 434–435
625

-- 641 of 650 --

Conversions, English to Metric units, 571
Cooper-Harper ratings, 371–372
Coordinate transformation, 147–153
Corrected properties, 68–76
Cramer’s rule, 605–607
Cross control derivative, 277–278
Cross derivative, 270–275
Crosswind landings, 225–229
Curves, 495–497
Damped frequency, 313
Damping ratio, natural frequency, 312–313
Data graphs, NACA, 577–588
Degree-of-freedom analysis, 344–356
Density altitude, definition, 14
Density of air, definition, 1
Derivatives
cross, 270–275
cross control, 277–278
directional static stability, 265
lateral static stability, 264–265
lateral-directional perturbed force and
moment, 263–279
longitudinal perturbed force and moment,
247–263
longitudinal perturbed thrust force and
moment, 280–283
primary control, 277–278
quasi-steady, 265–266
roll damping, 266–267
roll helix angle, 267–270
sideslip, 264
yaw damping, 275–277
Developing linearized aircraft EOM, 241–244
Digital control, 544–549
Directional static stability derivative, 265
Domain specifications, 518
Drag count, definition, 51
Drag of aircraft, 178–180, see also static
stability
Drag polar, 50–52
Drag summary, 45
Dutch roll, 368–371
Dynamic stability
aircraft class, 356
Cooper-Harper ratings, 371–372
Dutch roll, 368–371
flight phase category, 356–357
flying quality levels, 357–359
log decrement method, 373–374
mass-spring-damper system, 303–316
phugoid, 364
roll, 364–367
root representation using complex plane,
316–321
short period, 359–364
spiral, 367–368
test pilot approximation for damping ratio,
377
time ratio method, 374–377
transforming linearized EOM to Laplace
domain, 321–356
Earth axis system and transformation, 145–163
Elevator control power, 277
Elevator control power derivative, 277
Endurance of aircraft
average value endurance equation, 114
Breguet endurance equation, 114–116
specific endurance, 111–114
Engine-out analysis, 220–225
English Engineering System, 2
Equation of state for perfect gas, 4
Equations of motion
applied aero forces and moments, first-order
approximation, 244–279
body axis system, 145, 147–153
coordinate transformation, 147–153
developing linearized aircraft EOM,
241–244
Earth axis system, 145–153
force equations, 153–163
kinematic equations, 164–169
lateral-directional, 164
lateral-directional linearized EOM in
Laplace form, 342–356
lateral-directional perturbed force and
moment derivatives, 263–279
longitudinal, 164
longitudinal linearized EOM in Laplace
form, 328–341
longitudinal perturbed force and moment
derivatives, 247–263
perturbed thrust forces and moments,
first-order approximation, 279–285
recasting in acceleration format, 285–291
small perturbation approach, 239–241
stability axis system, 146–147
straight, level, unaccelerated flight, 85–87
transforming linearized EOM to Laplace
domain, 321–356
Euler method, 97–100
Experimental determination of system,
518–523
Experimental determination of system transfer
functions, 518–523
F-16 fly-by-wire system, 558–567
FB-111 barrier test program, 138–140
Feedback control systems
angle of attack feedback, 442–443
closed-loop analysis of second-order system,
394–399
closed-loop systems, 392–394
626 	INDEX

-- 642 of 650 --

closed-loop transfer functions, 399–403
combined systems, 457–463
compensation filters, 451–457
control augmentation systems, 434–435
Fly-by-wire systems, 435–436
Frequency response, 492–544
load factor feedback, 443–444
open-loop systems, 389–392
outer loop autopilot=navigation control,
444–451
pitch damper systems, 440–442
root locus analysis, 405–427
stability augmentation systems, 433–434
system type and steady-state error, 473–492
time response characteristics, 403–405
yaw damper systems, 436–440
Finite wings
drag summary, 45
geometry, 43–44
induced drag, 44–45
lift coefficient, 45–47
First-order approximation
nondimensionalizing of, 246–247
of applied aero forces and moments,
244–279
of perturbed thrust forces and moments,
279–285
First-order systems, 306–311
Flight control systems
integrated systems, 549–550
irreversible systems, 553–554
reversible systems, 551–553
robust control, 550–551
Flight phase category, 356-357
Flowfield properties, definition, 1–12
Fly-by-wire systems, 435–436
Flying quality levels, 357–359
Force equations, 153–163
Forces and moments, 190–191
Forces during takeoff, 92–93
Frequency response
background, 492–495
Bode plots and stability, 497–544
compensation devices, 523–544
curves, 495–497
digital control, 544–549
domain specifications, 518
experimental determination of system
transfer functions, 518–523
Functional relationship of thrust, 67–68
Genesis 2000 Flight Simulator, 169–170
Geometric dihedral angle, 205–206
Geometry, 43–44
Gliding flight, 102–108
Heun’s method, 99–100
Hydrostatic equation, 4–6
incompressible and compressible flow, 7–8
Induced drag, 44–45
Initial and final value theorems, 327–328
Integrated systems, 549–550
Irreversible systems, 553–554
Kinematic equations, 164–169
Laplace method
degree-of-freedom analysis, 344–356
initial and final value theorems, 327–328
Lateral-directional linearized EOM, 342–356
Longitudinal linearized EOM, 328–341
partial fraction expansion, 326–327
selected Laplace transforms, 603–604
standardized inputs, tables, transforms,
321–324
transfer functions and characteristic
equation, 324–326
Lateral static stability derivative, 264–265
Lateral-directional linearized EOM in Laplace
form, 342–356
Lateral-directional perturbed force and moment
derivatives, 263–279
Lateral-directional static stability, 215–229
Learjet Model 35, performance modeling,
76–78
Lift coefficient, 45–47
Lift of aircraft, 180–184, see also static
stability
Lift, airfoils, 16–17
Lift, drag, and moment coefficients, 31–33
Linearized aircraft EOM, 241–244
Load factor, 48–50
Load factor feedback, 443–444
Log decrement method, 373–374
Longitudinal EOM, 164
Longitudinal linearized EOM in Laplace form,
328–341
Longitudinal perturbed force and moment
derivatives, 247–263
Longitudinal perturbed thrust force and
moment derivatives, 280–283
Longitudinal static stability, 191–202
Mach effects, 38–42
Mach number
definition of, 11–13
in aircraft rolling moment, 204–205
in aircraft side force, 203–204
in thrust and power curves, 88
Magnitude and angle criteria, 411–416
Maneuvering flight and manuever point,
198–202
INDEX 	627

-- 643 of 650 --

Mass-spring-damper system
damped frequency, 313
damping ratio, natural frequency, 312–313
first-order systems, 306–311
second-order systems, 311–316
time constant, 309–310, 313–316
time to half and double amplitude, 310–311
Moment derivatives, see static stability
Moments of inertia, see equations of motion
NACA airfoil data graphs, 577–588
Neutral point and static margin, 195–198
Newton’s 2nd law, 2, 65, 92, 153
Newton’s 3rd law, 66
Nordic ski jumping aerodynamics, 135–138
One-dimensional flow, definition, 6–7
Open-loop feedback control systems, 389–392
Outer loop autopilot=navigation control,
444–451
Partial fraction expansion, 326–327
Perfect gas
definition, 4
equation of state for, 4
Perturbed flight, definition of, 239
Phases and ground roll distance, 91–92
Phugoid, 364
Piston-propeller system, 59
Pitch damper systems, 440–442
Pitching moment, 185–190
Point properties, 2–4
Pressure altitude, definition of, 14
Pressure drag, 26–28
Pressure, definition, 1
Pressure, temperature, and density altitudes,
14–15
Primary control derivative, 176–177, 277–278
Products of inertia, see equations of motion
Profile drag, 28–29
Properties of U.S. standard atmosphere,
(tabular format), 573–575
Propulsion
corrected properties, 68–76
functional relationship of thrust, 67–68
Piston-propeller system, 59
ramjet system, 62–64
thrust equations, 64–67
turbofan system, 62
turbojet system, 60–62
turboprop system, 59–60
Proverse yaw condition, 213
Pull-downs, 131–132
Pull-ups, 130–131
Quasi-steady derivative, 265–266
Ramjet system, 62–64
Range
average value range equation, 118–119
Breguet range equation, 119–124
Range factor method, 124–127
specific range, 116–118
Range factor method, 124–127
Recasting in acceleration format, 285–291
Relative motion, 15–16
Reversible systems, 551–553
Reynolds number airfoil computation, 21–29
Robust control, 550–551
Roll, 364–367
Roll helix angle derivative, 267–270
Rolling moment, 204–212
Root locus analysis
fundamentals, 408–411
introduction, 405–408
magnitude and angle criteria, 411–416
Rules for plotting root locus, 416–427
Root representation using complex plane,
316–321
Rudder control power, see derivative, primary
control
Rules for plotting root locus, 416–427
Second-order systems, 311–316
Selected Laplace transforms, 603–604
Short period, 359–364
Side force, 203–204
Sideslip derivative, 264
Small perturbation approach, 239–241
Source of aerodynamic forces, 15–16
Specific endurance, 111–114
Specific range, 116–118
Speed of sound, 11
Spins, 554–558
Spiral, 367–368
Stability, see static stability or dynamic
stability
Stability augmentation systems, 433–434
Stability axis system, 146–147
Stability derivatives, 176
Stall airspeed, 48–50
Standard atmosphere, 13–15
Standard pressure
definition and overview, 13–15
Standardized inputs, tables, transforms,
321–324
Static control power, aileron control power,
210–212
Static stability
aircraft drag, 178–180
aircraft lift, 180–184
628 	INDEX

-- 644 of 650 --

crosswind landings, 225–229
engine-out analysis, 220–225
lateral-directional, 215–229
longitudinal, 191–202
maneuvering flight and maneuver point,
198–202
neutral point and static margin, 195–198
overview, 173–174
pitching moment, 185–190
primary control derivatives, 176–177
proverse yaw condition, 214
requirements for, 194–195; 218–220
rolling moment, 204–212
Side force, 203–204
Stability derivatives, 176
trim conditions, 191–194, 216–218
vertical tail, 208–213
wing position, 206–207
wing sweep angle, 207–208
yawing moment, 212–215
Steady flow assumption, 2–4
Steady-state force derivatives, see static
stability
Straight, level, unaccelerated flight, 85–87
Streamline, definition, 3
System type and steady-state error, 473–492
T-38 performance data, 589–601
Takeoff and landing performance
approach, flare, ground roll, 100–102
average acceleration, 93–96
Euler method, 97–100
forces during takeoff, 92–93
Heun’s method, 99–100
phases and ground roll distance, 91–92
Temperature altitude, definition, 14
Temperature, definition, 1
Test pilot approximation for damping ratio, 377
Thrust
and power curves, 87–91
forces and moments, 190–191
in propulsion, 64–76
Thrust equations, 64–67
Time constant, 309–310, 313–316
Time ratio method, 374–377
Time response characteristics, 403–405
Time to half and double amplitude, 310–311
Total aircraft drag, 52–53
Transfer functions
and characteristic equations, 324–326
closed-loop, 399–403
development of longitudinal and
lateral-directional, 609–611
experimental determination of system,
518–523
Transforming linearized EOM to Laplace
domain, 321–356
Trim conditions, 191–194, 216–218
Turbofan system, 62
Turbojet system, 60–62
Turboprop system, 59–60
Turn performance, 127–135
U.S. standard atmosphere, (tabular format),
573–575
Units
table of units used in book, 2
V-n diagrams, 132–135
Velocity, definition of, 2
Vertical tail, 208–213
Viscous flow, definition, 17–18
Wing position, 206–207
Wing sweep angle, 207–208
X-38 Mid-rudder investigation, 230–232
X-38 parafoil cavity investigation, 291–296
Yaw damper systems, 436–440
Yaw damping derivative, 275–277
Yawing moment, 212–215
INDEX 	629

-- 645 of 650 --

This page intentionally left blank

-- 646 of 650 --

TEXTS PUBLISHED IN THE AIAA EDUCATION SERIES
Introduction to Aircraft Flight
Mechanics
Thomas R. Yechout with Steven L. Morris,
David E. Bossert,
and Wayne F. Hallgren 	2003
ISBN 1-56347-577-4
Analytical Mechanics of
Space Systems
Hanspeter Schaub and
John L. Junkins 	2003
ISBN 1-56347-563-4
Flight Testing of Fixed-Wing Aircraft
Ralph D. Kimberlin 	2003
ISBN 1-56347-564-2
Aircraft Design Projects for
Engineering Students
Lloyd Jenkinson and
James Marchman 	2003
ISBN 1-56347-619-3
Elements of Spacecraft Design
Charles D. Brown 	2002
ISBN 1-56347-524-3
Civil Avionics Systems
Ian Moir and Allan Seabridge 	2002
ISBN 1-56347-589-8
Helicopter Test and Evaluation
Alastair K. Cooke and
Eric W. H. Fitzpatrick 	2002
ISBN 1-56347-578-2
Aircraft Engine Design,
Second Edition
Jack D. Mattingly, William H. Heiser,
and David T. Pratt 	2002
ISBN 1-56347-538-3
Dynamics, Control, and Flying
Qualities of V=STOL Aircraft
James A. Franklin 	2002
ISBN 1-56347-575-8
Orbital Mechanics,
Third Edition
Vladimir A. Chobotov, Editor 	2002
ISBN 1-56347-537-5
Basic Helicopter Aerodynamics,
Second Edition
John Seddon and Simon Newman 	2001
ISBN 1-56347-510-3
Aircraft Systems: Mechanical,
Electrical, and Avionics Subsystems
Integration
Ian Moir and Allan Seabridge 	2001
ISBN 1-56347-506-5
Design Methodologies for Space
Transportation Systems
Walter E. Hammond 	2001
ISBN 1-56347-472-7
Tactical Missile Design
Eugene L. Fleeman 	2001
ISBN 1-56347-494-8
Flight Vehicle Performance and
Aerodynamic Control
Frederick O. Smetana 	2001
ISBN 1-56347-463-8
Modeling and Simulation of
Aerospace Vehicle Dynamics
Peter H. Zipfel 	2000
ISBN 1-56347-456-6
Applied Mathematics in Integrated
Navigation Systems
Robert M. Rogers 	2000
ISBN 1-56347-445-X
Mathematical Methods in Defense
Analyses, Third Edition
J. S. Przemieniecki 	2000
ISBN 1-56347-396-6
Finite Element Multidisciplinary
Analysis
Kajal K. Gupta and John L. Meek 	2000
ISBN 1-56347-393-3
Aircraft Performance: Theory and
Practice
M. E. Eshelby 	1999
ISBN 1-56347-398-4
631

-- 647 of 650 --

Space Transportation: A Systems
Approach to Analysis and Design
Walter E. Hammond 	1999
ISBN 1-56347-032-2
Civil Jet Aircraft Design
Lloyd R. Jenkinson, Paul Simpkin,
and Darren Rhodes 	1999
ISBN 1-56347-350-X
Structural Dynamics in Aeronautical
Engineering
Maher N. Bismarck–Nasr 	1999
ISBN 1-56347-323-2
Intake Aerodynamics, Second Edition
E. L. Goldsmith and J. Seddon 	1999
ISBN 1-56347-361-5
Integrated Navigation and Guidance
Systems
Daniel J. Biezad 	1999
ISBN 1-56347-291-0
Aircraft Handling Qualities
John Hodgkinson 	1999
ISBN 1-56347-331-3
Performance, Stability, Dynamics, and
Control of Airplanes
Bandu N. Pamadi 	1998
ISBN 1-56347-222-8
Spacecraft Mission Design,
Second Edition
Charles D. Brown 	1998
ISBN 1-56347-262-7
Computational Flight Dynamics
Malcolm J. Abzug 	1998
ISBN 1-56347-259-7
Space Vehicle Dynamics and Control
Bong Wie 	1998
ISBN 1-56347-261-9
Introduction to Aircraft Flight
Dynamics
Louis V. Schmidt 	1998
ISBN 1-56347-226-0
Aerothermodynamics of Gas Turbine
and Rocket Propulsion, Third Edition
Gordon C. Oates 	1997
ISBN 1-56347-241-4
Advanced Dynamics
Shuh-Jing Ying 	1997
ISBN 1-56347-224-4
Introduction to Aeronautics:
A Design Perspective
Steven A. Brandt, Randall J. Stiles, 	1997
John J. Bertin, and Ray Whitford
ISBN 1-56347-250-3
Introductory Aerodynamics and
Hydrodynamics of Wings and Bodies:
A Software-Based Approach
Frederick O. Smetana 	1997
ISBN 1-56347-242-2
An Introduction to Aircraft
Performance
Mario Asselin 	1997
ISBN 1-56347-221-X
Orbital Mechanics, Second Edition
Vladimir A. Chobotov, Editor 	1996
ISBN 1-56347-179-5
Thermal Structures for Aerospace
Applications
Earl A. Thornton 	1996
ISBN 1-56347-190-6
Structural Loads Analysis for
Commercial Transport Aircraft:
Theory and Practice
Ted L. Lomax 	1996
ISBN 1-56347-114-0
Spacecraft Propulsion
Charles D. Brown 	1996
ISBN 1-56347-128-0
Helicopter Flight Dynamics:
The Theory and Application
of Flying Qualities and
Simulation Modeling
Gareth D. Padfield 	1996
ISBN 1-56347-205-8
632 	SERIES LISTING

-- 648 of 650 --

Flying Qualities and Flight Testing
of the Airplane
Darrol Stinton 	1996
ISBN 1-56347-117-5
Flight Performance of Aircraft
S. K. Ojha 	1995
ISBN 1-56347-113-2
Operations Research Analysis
in Test and Evaluation
Donald L. Giadrosich 	1995
ISBN 1-56347-112-4
Radar and Laser Cross Section
Engineering
David C. Jenn 	1995
ISBN 1-56347-105-1
Introduction to the Control of
Dynamic Systems
Frederick O. Smetana 	1994
ISBN 1-56347-083-7
Tailless Aircraft in Theory and
Practice
Karl Nickel and Michael Wohlfahrt 	1994
ISBN 1-56347-094-2
Mathematical Methods in Defense
Analyses, Second Edition
J. S. Przemieniecki 	1994
ISBN 1-56347-092-6
Hypersonic Aerothermodynamics
John J. Bertin 	1994
ISBN 1-56347-036-5
Hypersonic Airbreathing
Propulsion
William H. Heiser and David T. Pratt 1994
ISBN 1-56347-035-7
Practical Intake Aerodynamic Design
E. L. Goldsmith and J. Seddon 	1993
ISBN 1-56347-064-0
Acquisition of Defense Systems
J. S. Przemieniecki, Editor 	1993
ISBN 1-56347-069-1
Dynamics of Atmospheric Re-Entry
Frank J. Regan and
Satya M. Anandakrishnan 	1993
ISBN 1-56347-048-9
Introduction to Dynamics and
Control of Flexible Structures
John L. Junkins and Youdan Kim 	1993
ISBN 1-56347-054-3
Spacecraft Mission Design
Charles D. Brown 	1992
ISBN 1-56347-041-1
Rotary Wing Structural Dynamics
and Aeroelasticity
Richard L. Bielawa 	1992
ISBN 1-56347-031-4
Aircraft Design: A Conceptual
Approach, Second Edition
Daniel P. Raymer 	1992
ISBN 0-930403-51-7
Optimization of Observation
and Control Processes
Veniamin V. Malyshev, Mihkail N.
Krasilshikov, and Valeri I. Karlov 	1992
ISBN 1-56347-040-3
Nonlinear Analysis of Shell
Structures
Anthony N. Palazotto and
Scott T. Dennis 	1992
ISBN 1-56347-033-0
Orbital Mechanics
Vladimir A. Chobotov, Editor 	1991
ISBN 1-56347-007-1
Critical Technologies for
National Defense
Air Force Institute of Technology 	1991
ISBN 1-56347-009-8
Space Vehicle Design
Michael D. Griffin and
James R. French 	1991
ISBN 0-930403-90-8
Defense Analyses Software
J. S. Przemieniecki 	1990
ISBN 0-930403-91-6
SERIES LISTING 	633

-- 649 of 650 --

Inlets for Supersonic Missiles
John J. Mahoney 	1990
ISBN 0-930403-79-7
Introduction to Mathematical
Methods in Defense Analyses
J. S. Przemieniecki 	1990
ISBN 0-930403-71-1
Basic Helicopter Aerodynamics
J. Seddon 	1990
ISBN 0-930403-67-3
Aircraft Propulsion Systems
Technology and Design
Gordon C. Oates, Editor 	1989
ISBN 0-930403-24-X
Boundary Layers
A. D. Young 	1989
ISBN 0-930403-57-6
Aircraft Design: A Conceptual
Approach
Daniel P. Raymer 	1989
ISBN 0-930403-51-7
Gust Loads on Aircraft: Concepts
and Applications
Frederic M. Hoblit 	1988
ISBN 0-930403-45-2
Aircraft Landing Gear Design:
Principles and Practices
Norman S. Currey 	1988
ISBN 0-930403-41-X
Mechanical Reliability: Theory,
Models and Applications
B. S. Dhillon 	1988
ISBN 0-930403-38-X
Re-Entry Aerodynamics
Wilbur L. Hankey 	1988
ISBN 0-930403-33-9
Aerothermodynamics of Gas Turbine
and Rocket Propulsion, Revised and
Enlarged
Gordon C. Oates 	1988
ISBN 0-930403-34-7
Advanced Classical
Thermodynamics
George Emanuel 	1987
ISBN 0-930403-28-2
Radar Electronic Warfare
August Golden Jr. 	1987
ISBN 0-930403-22-3
An Introduction to the Mathematics
and Methods of Astrodynamics
Richard H. Battin 	1987
ISBN 0-930403-25-8
Aircraft Engine Design
Jack D. Mattingly, William H. Heiser,
and Daniel H. Daley 	1987
ISBN 0-930403-23-1
Gasdynamics: Theory and
Applications
George Emanuel 	1986
ISBN 0-930403-12-6
Composite Materials for Aircraft
Structures
Brian C. Hoskin and 	1986
Alan A. Baker, Editors
ISBN 0-930403-11-8
Intake Aerodynamics
J. Seddon and E. L. Goldsmith 	1985
ISBN 0-930403-03-7
The Fundamentals of Aircraft Combat
Survivability Analysis and Design
Robert E. Ball 	1985
ISBN 0-930403-02-9
Aerothermodynamics of Aircraft
Engine Components
Gordon C. Oates, Editor 	1985
ISBN 0-915928-97-3
Aerothermodynamics of Gas Turbine
and Rocket Propulsion
Gordon C. Oates 	1984
ISBN 0-915928-87-6
Re-Entry Vehicle Dynamics
Frank J. Regan 	1984
ISBN 0-915928-78-7
634 	SERIES LISTING

-- 650 of 650 --

