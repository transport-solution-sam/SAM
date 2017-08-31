using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Devices.Geolocation;

namespace SAM
{
    class Trip
    {
        //-------------------member-------------------------------//

        String _tag;
        private BasicGeoposition _previousPos;
        private double _distanceInM;
        private double _consumedFuelInMl; //in l
        private List<SamPoint> _points = new List<SamPoint>();
        double _startTime;
        double _duration; //in ms
        List<double> _consumptionReference = new List<double>(); 
   
        //----------------------Constructor-----------------------//
        
        public Trip(String tag, int startTime)
        {
            _distanceInM = 0;
            _tag = tag;
            _consumedFuelInMl = 0;
            _points.Clear();
            _startTime = startTime;
            _duration=0;
        }

        //------------------Getter/Setter---------------------------//

        public double DistanceInM
        {
            get { return _distanceInM; }
        }

        public TimeSpan Duration
        {
            get
            {
                // if(_points.Count > 1)
                // {
                //     double currentTime = _points[_points.Count - 1].Timestamp;
                //     double startTime = _points[0].Timestamp;
                //     return TimeSpan.FromSeconds(currentTime-startTime);
                // }   
                // else return new TimeSpan(0,0,0);       
                //}
                int seconds = (int)(_duration / 1000);
                return new TimeSpan(0,0,seconds);
            }
        }

        public double AvgSpeedInKmh
        {
            get 
            {
                if (_points.Count > 1)
                    return (_distanceInM / Duration.TotalSeconds) * 3.6;
                else return 0;
            }
        }

        public double CountPoints
        {
            get { return _points.Count; }
        }

        public double AvgConsumptionInLH
        {
            get
            {
                //double consumption = 0;
                //foreach(var point in _points)
                //{
                //    consumption += point.Fuel; 
                //}
                //consumption /= (_points.Count-1);
                //return (consumption/_avgSpeedInKmh)*100;

                double durationInH = ((Duration.TotalSeconds /60.0)/60.0);
                if (durationInH > 0)
                    return (_consumedFuelInMl / durationInH)/1000;
                else return 0;
            }
        }

        public double AvgConsumptionInLKm
        {
            get
            {
                return (100 * AvgConsumptionInLH) / AvgSpeedInKmh; //in l/100km
            }
        }

        public List<BasicGeoposition> PositionList
        {
            get
            {
                List<BasicGeoposition> positionList = new List<BasicGeoposition>();

                foreach(var point in _points)
                {
                    positionList.Add(new BasicGeoposition{Latitude = point.Latidude, Longitude=point.Longitude});
                }
                return positionList;
            }
        }

        //returns reference value, calculated as average over time
        public double AvgReferenceValue
        {
            get
            {
                double sum = 0;
                foreach(var value in _consumptionReference)
                {
                    sum += value;
                }

                var previousTimestamp = _points[_points.Count - 1].Timestamp;
                TimeSpan TimeInS = TimeSpan.FromSeconds(_startTime - previousTimestamp);
                return sum / TimeInS.TotalSeconds;
            }
        }

        //---------------public functions-----------------------------------//

        public void addPosition(BasicGeoposition pos, double gpsTimestamp, int fuel, int referenceFuelValue)
        {
          

            SamPoint point = new SamPoint()
            {
                Latidude = pos.Latitude,
                Longitude = pos.Longitude,
                Timestamp = gpsTimestamp,
                Distance = 0
            };      

            if (_points.Count > 0)
            {
                var previousTimestamp = _points[_points.Count - 1].Timestamp;
                TimeSpan TimeInS = TimeSpan.FromSeconds(gpsTimestamp-previousTimestamp);
                point.Distance = calculateDistanceInM(pos, _previousPos);
                double fuelInMl = ((fuel) / 3600.0) * TimeInS.TotalSeconds; //calculation of absolute fuel consumption in ml
                point.Fuel = fuelInMl;
                _consumedFuelInMl += fuelInMl;

                _consumptionReference.Add((referenceFuelValue * TimeInS.TotalSeconds));
            }
            else
            {
                point.Fuel = 0;
            }

            _previousPos = pos;
            
            _distanceInM += point.Distance;
            _points.Add(point);
        }




        public async Task<SamServerResponse> submitPoints()
        {
            // int transmittedInByte;
            SamServerResponse response = await (App.Current as App).Server.TransmitTrip(_points, _tag);
            _points.Clear();
            return response;
        }



        //----------------------private functions------------------------------//
        //---------Distance Calcualtor (adapted from http://www.geodatasource.com/developers/c-sharp )-------------------------//
        public static double calculateDistanceInM(BasicGeoposition point1, BasicGeoposition point2)
        {
            double lat1 = point1.Latitude;
            double lon1 = point1.Longitude;
            double lat2 = point2.Latitude;
            double lon2 = point2.Longitude;

            double theta = lon1 - lon2;
            double dist = Math.Sin(deg2rad(lat1)) * Math.Sin(deg2rad(lat2)) + Math.Cos(deg2rad(lat1)) * Math.Cos(deg2rad(lat2)) * Math.Cos(deg2rad(theta));
            dist = Math.Acos(dist);
            dist = rad2deg(dist);
            dist = dist * 60 * 1.1515;
            dist = dist * 1.609344;
            dist *= 1000; 

            return (dist);
        }

        private static double deg2rad(double deg)
        {
            return (deg * Math.PI / 180.0);
        }

        private static double rad2deg(double rad)
        {
            return (rad / Math.PI * 180.0);
        }

        internal void refreshTimeInS(int p)
        {
            _duration = p - _startTime;
        }
    }

    public class SamPoint
    {
        double _latidude;
        public double Latidude
        {
            get { return _latidude; }
            set { _latidude = Math.Round(value,5); }
        }
        double _longitude;
        public double Longitude
        {
            get { return _longitude; }
            set { _longitude = Math.Round(value,5); }
        }
        double _timestamp;
        public double Timestamp
        {
            get { return _timestamp; }
            set { _timestamp = value; }
        }
        double _fuel;    //since last point
        public double Fuel
        {
            get { return _fuel;}
            set { _fuel = value; }
        }
        double _distance; //since last point
        public double Distance
        {
            get { return Math.Round(_distance, 2); }
            set { _distance = value; }
        }
    }
}
