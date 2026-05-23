export const newton = function(aero : number, hw : number, tr : number, tran : number, p : number)  {        /* Newton's method */
    var vel = 20;       // Initial guess
    var MAX = 10;       // maximum iterations
    var TOL = 0.05;     // tolerance
    let i = 0;
    for (i=1;i < MAX;i++) {
        var tv = vel + hw;
        var aeroEff = (tv > 0.0) ? aero : -aero; // wind in face, must reverse effect
        var f = vel * (aeroEff * tv * tv + tr) - tran * p; // the function
        var fp = aeroEff * (3.0 * vel + hw) * tv + tr;     // the derivative
        var vNew = vel - f / fp;
        if (Math.abs(vNew - vel) < TOL) return vNew;  // success
        vel = vNew;
    }
    return 0.0;  // failed to converge
};

const tireValues = [
    0.005,
    0.004,
    0.012
];
const aeroValues = [
    0.388,
    0.445,
    0.420,
    0.300,
    0.233,
    0.200
];

export const getPowerOrVelocity = function(distance : number, elevation : number, grade : number, headwind : number, power : number|undefined, speed : number,
    temperature: number
) {
    // all done in metric units, JIT conversion to/from
    // but velocity returned in mph

        // get most form values
        const rweightv = 68; // kg
        const bweightv = 9; // kg
        const rollingRes = tireValues[0];   // clinchers
        const frontalArea = aeroValues[0];  // on the hoods
        let headwindv = (headwind  * 1.609) / 3.6;  // converted to m/s
        const temperaturev = temperature; // C
        const transv = 0.95; // no one knows what this is, so why bother presenting a choice?

        /* Common calculations */
        const density = (1.293 - 0.00426 * temperaturev) * Math.exp(-elevation / 7000.0);
        const twt = 9.8 * (rweightv + bweightv);  // total weight in newtons
        const A2 = 0.5 * frontalArea * density;  // full air resistance parameter
        const tres = twt * (grade + rollingRes); // gravity and rolling resistance

        if (power!==undefined) {  // we calculate velocity from power when calcMode = 0

            let v = newton(A2, headwindv, tres, transv, power) * 3.6;      // convert to km/h

            return (v * 0.6214 );

        } else {  // we calculate power from velocity
            const v = speed / 3.6 * 1.609;  // converted to m/s;
            let tv = v + headwindv;
            var A2Eff = (tv > 0.0) ? A2 : -A2; // wind in face, must reverse effect
            return (v * tres + v * tv * tv * A2Eff) / transv;
        }
};
