import type {UserControl} from '../redux/controlsSlice'
import type {Point} from './gpxParser'
import type { GpxRouteData, RwgpsRoute, RwgpsTrip, } from '../redux/routeInfoSlice';

export type Bounds = {
  min_latitude: number
  min_longitude: number
  max_latitude: number
  max_longitude: number
}

const formatOneControl = (controlPoint : string | UserControl) => {
  if (typeof controlPoint === 'string') {
    return controlPoint.replaceAll(":", "$");
  }
  return controlPoint.name.replaceAll(":", "$").replaceAll(",","~") + "," + controlPoint.distance + "," + controlPoint.duration
};

export const maxWidthForMobile = '501px'

// TODO
// ask wtf is up with this & parseControls()
export const formatControlsForUrl = (controlPoints : Array<UserControl>, filter: boolean) => {
  const filteredControlPoints = filter ? controlPoints.filter(point => point.name !== '').filter(point => {return !isNaN(point.distance) && !isNaN(point.duration)}) : controlPoints
  return filteredControlPoints.reduce((queryParam,point) => {return queryParam + ':' + formatOneControl(point)},'')
};

export const setMinMaxCoords = (trackPoint : Point,bounds : Bounds) => {
  bounds.min_latitude = Math.min(trackPoint.lat, bounds.min_latitude);
  bounds.min_longitude = Math.min(trackPoint.lon, bounds.min_longitude);
  bounds.max_latitude = Math.max(trackPoint.lat, bounds.max_latitude);
  bounds.max_longitude = Math.max(trackPoint.lon, bounds.max_longitude);
  return bounds;
};

export const parseControls = function (controlPointString : string, deleteFirstElement : boolean) {
  if (controlPointString === null || controlPointString === undefined) {
    return [];
  }
  if (deleteFirstElement) {
    let controlPointList = controlPointString.split(":");
    let controlPoints =
      controlPointList.filter(item => item.length > 0)
        .filter(point => { const values = point.split(",");return !Number.isNaN(Number.parseInt(values[1])) && !isNaN(Number.parseInt(values[2])) })
        .map((point, index) => {
          let controlPointValues = point.split(",");
          return ({ name: controlPointValues[0]?controlPointValues[0].replaceAll("$", ":").replaceAll("~",","):controlPointValues[0], 
            distance: Number(controlPointValues[1]), duration: Number(controlPointValues[2]), id: index });
        });
    // delete dummy first element
    // controlPoints.splice(0, 1);
    return controlPoints;
  } else {
    let controlPointList = controlPointString.split(":");
    const controlPoints = controlPointList.filter(item => item.length > 0).filter(point => { const values = point.split(",");return !Number.isNaN(Number.parseInt(values[1])) && !Number.isNaN(Number.parseInt(values[2])) })
      .map((point, index) => {
        let controlPointValues = point.split(",");
        return ({ name: controlPointValues[0]?controlPointValues[0].replaceAll("$", ":").replaceAll("~",","):controlPointValues[0], 
          distance: Number(controlPointValues[1]), duration: Number(controlPointValues[2]), id: index });
      });
    // delete dummy first element
    // controlPoints.splice(0, 1);
    return controlPoints;
  }
}

export const getRwgpsRouteName = (route : RwgpsRoute | RwgpsTrip) => route[route.type]!.name
export const getGpxRouteName = (route : GpxRouteData) => route.tracks[0].name

export const controlsMeaningfullyDifferent = (controls1 : Array<UserControl>, controls2 : Array<UserControl>) => {
  return controls1.length !== controls2.length ||
    controls1.some(
      (control, index : number) => control.distance !== controls2[index].distance ||
                          control.duration !== controls2[index].duration
    )
}

export const stringIsOnlyNumeric = (string : string) => string.match(/^[0-9]+$/) !== null
export const stringIsOnlyDecimal = (string : string) => string.match(/^[0-9.]*$/) !== null

export const milesToMeters = 1609.34;

interface PaceTable {
  [index:string]:number
}

export const paceToSpeed : PaceTable = {'Q':3, 'R':4, 'S':5, 'T':6, 'A-':9, 'A':10, 'A+':11, 'B':12, 'B+':13, 'C':14, 'C+':15, 'D':16, 'D+':17, 'E':18, 'E+':19, "F":20, "F+":21};
export const inputPaceToSpeed : PaceTable = {'Q':3, 'R':4, 'S':5, 'T':6, 'A-':9, 'A':10, 'A+':11, 'B':12, 'B+':13, 'C-':13, 'C':14, 'C+':15, 'D-':15, 'D':16, 'D+':17, 'E':18, 'E+':19, "F":20, "F+":21};
export const metricPaceToSpeed : PaceTable = {"Q":5, "R":6, "S":8, "T":10, 'A-':15, 'A':16, 'A+':18, 'B-':18, 'B':19, 'B+':21, 'C-':21, 'C':22, 'C+':24, 'D-':24, 'D':26, 'D+':27, 'E-':27, 'E':29, "E+":31, "F":32, "F+":34};

export const getRouteNumberFromValue = (value : string) => {
  if (value &&  typeof value === 'string') {
    const lastSlashIndex = value.lastIndexOf('/');
    if (lastSlashIndex >= 0) {
      return value.substring(lastSlashIndex + 1)
    } else {
      return value
    }
  }
  return value;
}

/*const sanitizeCookieName = (cookieName : string) => {
  return encodeURIComponent(cookieName.replace(/[ =/]/,''));
};

export const saveCookie = (name : string,value : string) => {
      cookie.save(sanitizeCookieName(name),value,{maxAge:60*60*24*7});
};

export const loadCookie = (name : string) => {
  return cookie.load(sanitizeCookieName(name));
};*/
