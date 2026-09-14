// Know Your Rasi — astronomy calculation engine.
//
// Uses the astronomy-engine library for real Sun/Moon/sidereal-time
// positions, then applies the Lahiri ayanamsa (approximate, anchored at
// J2000 ~= 23.8537 degrees, advancing at the general precession rate) to
// convert to sidereal (Vedic) longitudes. The Ascendant uses the standard
// tropical-to-Lagna formula from local sidereal time, latitude and the
// ecliptic's true obliquity.
//
// Depends on the global `Astronomy` object — load
// https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.js
// before this file on any page that calls RasiCalc.computeAstroProfile.
//
// Shared by astrology.html (per-member profile) and rasi-family-list.html
// (computing every member's rasi/lagnam/nakshatra for the flat list), so
// this ~90-line engine lives in exactly one place.
var RasiCalc = (function () {
  function lahiriAyanamsa(utcDate) {
    var msPerYear = 365.25 * 24 * 3600 * 1000;
    var decimalYear = 2000.0 + (utcDate.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / msPerYear;
    return 23.85370 + (decimalYear - 2000.0) * (50.2388475 / 3600);
  }

  function siderealLongitude(tropicalLon, ayanamsa) {
    return ((tropicalLon - ayanamsa) % 360 + 360) % 360;
  }

  function rashiIndexFromLongitude(siderealLon) {
    return Math.floor(siderealLon / 30) % 12;
  }

  function nakshatraFromLongitude(siderealLon) {
    var span = 360 / 27;
    var idx = Math.floor(siderealLon / span) % 27;
    var within = siderealLon - idx * span;
    var pada = Math.floor(within / (span / 4)) + 1;
    return { index: idx, pada: pada };
  }

  /* The Ascendant is found numerically rather than via a hand-derived      */
  /* trig formula: for a fixed birth moment, scan ecliptic longitude        */
  /* around the full circle, convert each point to RA/Dec (a simple,        */
  /* standard ecliptic-to-equatorial rotation) and feed it through          */
  /* astronomy-engine's own tested Horizon() transform to get altitude/     */
  /* azimuth. The Ascendant is the ecliptic point whose altitude crosses    */
  /* zero on the eastern side of the sky (azimuth 0-180 degrees) - that's   */
  /* the literal definition of "rising on the horizon", so this sidesteps   */
  /* any risk of a sign/quadrant error in a memorized closed-form formula.  */

  function eclipticToEquatorialOfDate(lambdaDeg, obliquityDeg) {
    var lambda = lambdaDeg * Math.PI / 180;
    var eps = obliquityDeg * Math.PI / 180;
    var raRad = Math.atan2(Math.sin(lambda) * Math.cos(eps), Math.cos(lambda));
    var raDeg = (raRad * 180 / Math.PI + 360) % 360;
    var decDeg = Math.asin(Math.sin(lambda) * Math.sin(eps)) * 180 / Math.PI;
    return { raHours: raDeg / 15, decDeg: decDeg };
  }

  function horizonForEclipticLongitude(lambdaDeg, time, observer, obliquityDeg) {
    var eq = eclipticToEquatorialOfDate(lambdaDeg, obliquityDeg);
    return Astronomy.Horizon(time, observer, eq.raHours, eq.decDeg, 'normal');
  }

  function computeAscendantTropical(time, observer, obliquityDeg) {
    var step = 2;
    var crossings = [];
    var prevLambda = 0;
    var prevAlt = horizonForEclipticLongitude(0, time, observer, obliquityDeg).altitude;
    for (var lam = step; lam <= 360; lam += step) {
      var alt = horizonForEclipticLongitude(lam, time, observer, obliquityDeg).altitude;
      if ((prevAlt < 0 && alt >= 0) || (prevAlt >= 0 && alt < 0)) {
        var frac = (0 - prevAlt) / (alt - prevAlt);
        var lamCross = prevLambda + frac * (lam - prevLambda);
        crossings.push(((lamCross % 360) + 360) % 360);
      }
      prevAlt = alt;
      prevLambda = lam;
    }
    for (var i = 0; i < crossings.length; i++) {
      var hor = horizonForEclipticLongitude(crossings[i], time, observer, obliquityDeg);
      if (hor.azimuth >= 0 && hor.azimuth < 180) {
        return crossings[i];
      }
    }
    return crossings.length ? crossings[0] : 0;
  }

  function computeAstroProfile(dob, timeStr, city) {
    var parts = dob.split('-').map(Number);
    var tparts = timeStr.split(':').map(Number);
    var utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], tparts[0], tparts[1], 0));
    utcDate = new Date(utcDate.getTime() - (5 * 60 + 30) * 60 * 1000); // IST -> UTC

    var time = Astronomy.MakeTime(utcDate);
    var moon = Astronomy.EclipticGeoMoon(time);
    var ayanamsa = lahiriAyanamsa(utcDate);
    var moonSidereal = siderealLongitude(moon.lon, ayanamsa);
    var rashiIdx = rashiIndexFromLongitude(moonSidereal);
    var nak = nakshatraFromLongitude(moonSidereal);

    var observer = new Astronomy.Observer(city.lat, city.lon, 0);
    var obliquity = Astronomy.e_tilt(time).tobl;
    var ascTropical = computeAscendantTropical(time, observer, obliquity);
    var ascSidereal = siderealLongitude(ascTropical, ayanamsa);
    var lagnaIdx = rashiIndexFromLongitude(ascSidereal);

    return { rashiIdx: rashiIdx, nakshatraIdx: nak.index, nakshatraPada: nak.pada, lagnaIdx: lagnaIdx };
  }

  return {
    lahiriAyanamsa: lahiriAyanamsa,
    siderealLongitude: siderealLongitude,
    rashiIndexFromLongitude: rashiIndexFromLongitude,
    nakshatraFromLongitude: nakshatraFromLongitude,
    computeAscendantTropical: computeAscendantTropical,
    computeAstroProfile: computeAstroProfile
  };
})();
