using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SAM
{
    public class ComparableTrip
    {

        public double totalDistance {get; set;}
        public double totalFuel { get; set; }
        public double totalTime { get; set; }
        public List<Point> points { get; set; }      
    }

    public class TripComparerFuel : IComparer<ComparableTrip>
    {
        public int Compare(ComparableTrip x, ComparableTrip y)
        {
            if (x.totalFuel > y.totalFuel) return 1;
            if (x.totalFuel == y.totalFuel) return 0;
            else return -1;
        }
    }

    public class TripComparerTime : IComparer<ComparableTrip>
    {
        public int Compare(ComparableTrip x, ComparableTrip y)
        {
            if (x.totalTime > y.totalTime) return 1;
            if (x.totalTime == y.totalTime) return 0;
            else return -1;
        }
    }

    public class Point
    {
        public double lon { get; set; }
        public double lat { get; set; }
        public double time { get; set; }
        public double distance { get; set; }
        public double fuel { get; set; }
    }
}
