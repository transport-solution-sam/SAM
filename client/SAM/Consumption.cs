using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;

namespace SAM
{
    [DataContract]
    [KnownType(typeof(Dictionary<string, DieselConsumption>))]
    public class ConsumptionContainer
    {
        Dictionary<string, IConsumption> _consumptions;

        [DataMember]
        public Dictionary<string, IConsumption> Consumptions
        {
            get
            {
                return _consumptions;
            }

            set
            {
                _consumptions = value;
            }
        }
    }


    [DataContract]
    public abstract class IConsumption
    {
        protected List<Double> _consumptionBuffer = new List<Double>();
        protected List<Double> _rawConsumptionBuffer = new List<Double>();
        public abstract Tuple<Double, Double> getConsumption(); //in l/h -> Returns Consumption and Reference; Resets internal buffer
        public abstract Double displayConsumption(); //in l/h -> returns current consumption without resetting internal buffers
        public abstract void addConsumptionPoint(List<String> obdResults);
        public abstract List<ObdCommand> getObdCommands();
    }

   
    public class PetrolConsumption : IConsumption
    {
        public PetrolConsumption()
        {
            throw new NotImplementedException();
        }

        public override void addConsumptionPoint(List<string> obdResults)
        {
            throw new NotImplementedException();
        }

        public override double displayConsumption()
        {
            throw new NotImplementedException();
        }

        public override Tuple<double, double> getConsumption()
        {
            throw new NotImplementedException();
        }

        public override List<ObdCommand> getObdCommands()
        {
            throw new NotImplementedException();
        }
    }


    [DataContract]
    public class DieselConsumption : IConsumption
    {
       

        [DataMember]
        public double M
        {
            get
            {
                return _m;
            }

            set
            {
                _m = value;
            }
        }

        [DataMember]
        public double N
        {
            get
            {
                return _n;
            }

            set
            {
                _n = value;
            }
        }

        List<double> referenceCalibrationPoints = new List<double>(); //airflow * engineload
       
        private double _m;
        private double _n;
        protected List<double> literPerHCalibrationPoints = new List<double>();

        public DieselConsumption(double m, double n)
        {
            M = m;
            N = n;
        }

        public override void addConsumptionPoint(List<String> obdResults)
        {
            double tEngineLoad = double.Parse(obdResults[0]);
            double tRqm = double.Parse(obdResults[1]);
            double tAirFlow = double.Parse(obdResults[2]);
            double consumption = 0;

            double raw_consumption = tAirFlow * tEngineLoad;
            if (tRqm == 0) consumption = 0;
            else if (tRqm < 950) consumption = (M * (raw_consumption) + N) - 0.6;
            else if (tEngineLoad == 0) consumption = 0;
            else consumption = M * (raw_consumption) + N;  //calculates consumption in l/h
            
                
            lock (_consumptionBuffer)
            {
                _consumptionBuffer.Add(consumption);
                _rawConsumptionBuffer.Add(raw_consumption);
            }
        }

        public override Tuple<Double, Double> getConsumption()
            // retuns consumption and reference value for consumption
        {
            Double consumption = 0;
            lock(_consumptionBuffer)
            {
            consumption = _consumptionBuffer.Average();
            _consumptionBuffer.Clear();
            _consumptionBuffer.Add(consumption);
            }
            Double rawConsumption = 0;
            lock (_consumptionBuffer)
            {
                rawConsumption = _rawConsumptionBuffer.Average();
                _rawConsumptionBuffer.Clear();
                _rawConsumptionBuffer.Add(rawConsumption);
            }


            return new Tuple<double, double>(consumption, rawConsumption);
        }

        public override double displayConsumption()
        {
            double consumption = _consumptionBuffer.Average(); //in l/h
            return consumption;

        }


        public override List<ObdCommand> getObdCommands()
        {
            List<ObdCommand> parameters = new List<ObdCommand>();
            parameters.Add(new engineLoad());
            parameters.Add(new rqm());
            parameters.Add(new airFlow());
            return parameters;
        }
    }
}

