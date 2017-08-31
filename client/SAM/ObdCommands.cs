using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SAM
{
    public abstract class ObdCommand
    {     
        public abstract String AsciiCode{get;}
        public abstract String interpretResponse(String response);
        public abstract int getResponseValue(String response);
        protected String cleanupResponse(String response)
        {
            response = response.Replace(" ", "");
            response = response.Replace("\r", "");
            response = response.Replace(">", "");
            response = response.Replace("SEARCHING...", "");
            return response;
        }

    }

    public abstract class oneByteObd : ObdCommand
    {
        public override int getResponseValue(String response)
        {
            try
            { 
            response = base.cleanupResponse(response);
            response = response.Substring(8, 2);
            return Convert.ToInt32(response, 16);
            }
            catch(Exception){return -1;}
        }
    }

    public abstract class twoByteObd : ObdCommand
    {  
           public override int getResponseValue(String response)
           {
                response = base.cleanupResponse(response);
                response = response.Substring(8, 4);
                try{ return Convert.ToInt32(response, 16);}
                catch(Exception){return -1;}
           }
    }

    public abstract class fourByteObd : ObdCommand
    {
      public override int getResponseValue(String response)
        {
            response = base.cleanupResponse(response);
            response = response.Substring(8, 8);
            try { return Convert.ToInt32(response, 16); }
            catch (Exception) { return -1; }
        }
     }        
    

//--------------------OBD Command- Implementations-------------------------//

    public class speed : oneByteObd
    {
        public speed() { }

        public override String AsciiCode{ get { return "010D"; }}

        public override String interpretResponse(String response)
        {
            return base.getResponseValue(response).ToString(); //in kph
        }
    }

    public class torque : oneByteObd
    {
        public torque() { }

        public override String AsciiCode{ get { return "0162"; }}

        public override String interpretResponse(String response)
        {
            int value = base.getResponseValue(response);
            return (value-125).ToString(); //in percentage
        }
    }

    public class rqm : twoByteObd
    {
        public rqm(){ }

        public override String AsciiCode{get { return "010C"; }}

        public override String interpretResponse(String response)
        {
            int value = base.getResponseValue(response);
            return (value/4).ToString(); //in rotations per minute
        }   
    }

    public class airFlow : twoByteObd
    {
        public airFlow() { }

        public override String AsciiCode{get { return "0110";}}

        public override String interpretResponse(String response)
        {
            int value = base.getResponseValue(response);
            var result = (value / 100).ToString(); //in grams per second
            return result;
        }  
    }

    public class engineLoad : oneByteObd
    {
        public engineLoad() { }
        public override string AsciiCode
        {
            get { return "0104"; }
        }



        public override String interpretResponse(String response)
        {
            double value = base.getResponseValue(response);
            value = value* 100/255;
            return value.ToString(); //in percent 
        }

    }

    public class fuelRate: twoByteObd
    {
        public fuelRate() { }

        public override string AsciiCode
        {
            get { return "015E"; }
        }

        public override String interpretResponse(String response)
        {
            int value = base.getResponseValue(response);
            return (value * 0.05).ToString(); //in l/h
        } 
    }


    //CONFIGURATION OBD-COMMANDS--------------------------------------------------------------------------

    public class reset : ObdCommand
    {
        public reset() { }

        public override String AsciiCode
        {
            get { return "ATZ"; }
        }

        public override String interpretResponse(String response)
        {
            //expexted resonse: "ATZ\r\r\rELM327 v1.5\r\r>"
            response = base.cleanupResponse(response); 
             response = response.Substring(3, 10);
            return response; //ELM-Version
        }

        public override int getResponseValue(string response)
        {
            //response = base.cleanupResponse(response);
            //response = response.Substring(3, 10);
            //try { return Convert.ToInt32(response, 16); }
            //catch (Exception) { return -1; }     
            return 327;
        }
    }

    
    public class autoProtocoll : ObdCommand
    {
        public autoProtocoll() { }

       public override String AsciiCode
        {
            get { return "ATSP0"; }
        }

        public override String interpretResponse(String response)
        {
            response = response.Replace(" ", "");
            response = response.Replace("\r", "");
            response = response.Replace(">", "");
            // response = response.Substring(3, 10);
            return response; //Status
        }

          public override int getResponseValue(string response)
        {
            //response = base.cleanupResponse(response);
            //response = response.Substring(3, 10);
            //try { return Convert.ToInt32(response, 16); }
            //catch (Exception) { return -1; }     
            return 1;
        }
    }

    public class disableEcho : ObdCommand
    {
        public disableEcho() { }

        public override String AsciiCode
        {
            get { return "ATE0"; }
        }

        public override String interpretResponse(String response)
        {
            response = response.Replace(" ", "");
            response = response.Replace("\r", "");
            response = response.Replace(">", "");
            response = response.Substring(4, 2);
            return response; //Status
        }

        public override int getResponseValue(string response)
        {
            //response = base.cleanupResponse(response);
            //response = response.Substring(3, 10);
            //try { return Convert.ToInt32(response, 16); }
            //catch (Exception) { return -1; }     
            return 1;
        }
    }
}



