using System;
using System.Collections.Generic;
using Windows.Data.Json; //using JSON processing
using System.Threading.Tasks;
using Windows.Web.Http;
using Windows.Web.Http.Headers;
using Windows.Web.Http.Filters;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using System.Diagnostics;

namespace SAM
{
    public class SamServerResponse
    {
        public Boolean successfull { get; set; }
        public int ErrorCode { get; set; }
        public String ErrorMessage { get; set; }
    }

    public class SamTagResponse:SamServerResponse
    {
        public List<SamTag> Tags { get; set; }
    }

    public class SamComparableTripResonse:SamServerResponse
    {
        public List<ComparableTrip> Trip { get; set; }
    }

   

    //Initialized globally in App.xaml.cs
    //to communicate with SAM Server. Features:
    // - login, session management
    // - trip-, tag transmission
    // - account managagement

    //HTTP Message Functions return error-code "1" if there are connection issues
    //                              error-code "0" if everything workes as excpected
    //                              error-code > 10 -> server-error-code    
    public class ServerCommunication
    {
        //Members for Server-Communication
        String _userMail;
        String _userPassword;
        HttpCookie _sessionCookie;
        int _userId = 0;
        String _serverUrl = "http://188.68.48.171/";

        SamServerResponse GenericConnectionFailedResponse = new SamServerResponse { successfull = false, ErrorMessage = "Keine Internetverbindung." };
       

    public HttpCookie sessionCookie
        {
            get { return _sessionCookie; }
        }

        public ServerCommunication(String mail, String password)
        {
            _userMail = mail;
            _userPassword = password;
        }


        //private functions----------------------------------------------------------------------------------

        //perform post to endpoint of SAM Server, inputs are HTTP_Content (Parameter) and endpoint without "/"
        //returns error-code of call
        private async Task<SamServerResponse> PerformGenericHTTPPost(String httpContent, String endpoint)
        {
            HttpClient client = new HttpClient();

            Uri domain = new Uri(_serverUrl + endpoint);
            Windows.Web.Http.HttpStringContent httpFrame = new HttpStringContent(httpContent);
            httpFrame.Headers.ContentType = new HttpMediaTypeHeaderValue("application/x-www-form-urlencoded");

            try
            {
                HttpResponseMessage response = await client.PostAsync(domain, httpFrame);
                return AnalyzeResponse(response);
            }
            catch (Exception)
            {
                return new SamServerResponse { successfull = false, ErrorMessage = "No Internet Connection" };
            }
        }

        private async Task<SamServerResponse> PerformGenericHTTPGet(String endpoint)
        {
            HttpClient client = new HttpClient();
            Uri domain = new Uri(_serverUrl + endpoint);
            try
            {
                HttpResponseMessage response = await client.GetAsync(domain);
                return AnalyzeResponse(response);       
            }
            catch (Exception)
            {
                return GenericConnectionFailedResponse;
            }
        }

        public async Task<SamServerResponse> Post(String json)
        {
            HttpBaseProtocolFilter filter = new HttpBaseProtocolFilter();
            filter.CookieManager.SetCookie(_sessionCookie);

            HttpClient client = new HttpClient();
            Uri domain = new Uri(_serverUrl + "v02/send_data.json");
            Debug.WriteLine(domain.ToString());
            HttpStringContent httpFrame = new HttpStringContent(json);

            try
            {
                HttpResponseMessage response = await client.PostAsync(domain, httpFrame);
                return AnalyzeResponse(response);
            }
            catch (Exception)
            {
                return GenericConnectionFailedResponse;
            }
        }


        //public functions-------------------------------------------------------------------------------------

        //signup on server and set cookie for communication
        public async Task<SamServerResponse> Signup()
        {
            HttpClient client = new HttpClient();

            Uri domain = new Uri(_serverUrl + "register/");
            Windows.Web.Http.HttpStringContent httpFrame = new HttpStringContent("username=" + _userMail + "&password=" + _userPassword);
            httpFrame.Headers.ContentType = new HttpMediaTypeHeaderValue("application/x-www-form-urlencoded");

            try
            {
                HttpResponseMessage message = await client.PostAsync(domain, httpFrame);

                HttpBaseProtocolFilter filter = new HttpBaseProtocolFilter();
                HttpCookieCollection cookieCollection = filter.CookieManager.GetCookies(domain);

                try
                {
                    HttpCookie receivedCookie = cookieCollection[0];
                    _sessionCookie = new HttpCookie(receivedCookie.Name, _serverUrl + "/v02/send_data.json", receivedCookie.Path);
                    _sessionCookie.Value = receivedCookie.Value;
                }
                catch (Exception)
                {
                    return new SamServerResponse { successfull = false, ErrorMessage = "Fehler beim Setzen des Cookies" };
                }

                return AnalyzeResponse(message);
            }
            catch (Exception)
            {
                return GenericConnectionFailedResponse;
            }
        }

        //signin on server an set cookie for communication
        public async Task<SamServerResponse> Signin()
        {
            HttpClient client = new HttpClient();

            Uri domain = new Uri(_serverUrl + "signin/");
            Windows.Web.Http.HttpStringContent httpFrame = new HttpStringContent("username=" + _userMail + "&password=" + _userPassword);
            httpFrame.Headers.ContentType = new HttpMediaTypeHeaderValue("application/x-www-form-urlencoded");
            try
            {
                HttpResponseMessage message = await client.PostAsync(domain, httpFrame);

                HttpBaseProtocolFilter filter = new HttpBaseProtocolFilter();
                HttpCookieCollection cookieCollection = filter.CookieManager.GetCookies(domain);

                try
                {
                    HttpCookie receivedCookie = cookieCollection[0];
                    _sessionCookie = new HttpCookie(receivedCookie.Name, _serverUrl, receivedCookie.Path);
                    _sessionCookie.Value = receivedCookie.Value;
                }
                catch (Exception)
                {
                    return new SamServerResponse { successfull = false, ErrorMessage = "Fehler beim Setzen von Cookies." };
                }
                var analyzedResponse =  AnalyzeResponse(message);
                if (analyzedResponse.successfull)
                {
                    JObject json = JObject.Parse(message.Content.ToString());
                    _userId = Int32.Parse(json["id"].ToString());
                }
                return analyzedResponse;
               
            }
            catch(Exception)
            {
                return GenericConnectionFailedResponse;
            }
           
        }

        //closes session with server
        public async Task<SamServerResponse> Signout()
        {
            return await PerformGenericHTTPGet("signout/");
        }

        //sends request to change password 
        public async Task<SamServerResponse> ChangePassword(String newPassword)
        {
            return await PerformGenericHTTPPost("password=" + newPassword, "changeaccess/");
        }

        //sends request to change username
        public async Task<SamServerResponse> ChangeUsername(String newUsername)
        {
            return await PerformGenericHTTPPost("&username=" + newUsername, "changeaccess/");
        }

        //sends request to delete user from database
        public async Task<SamServerResponse> DeleteUser()
        {
            return await PerformGenericHTTPPost("confirm=true", "deleteuser/");
        }

        //downloads user-tags and returns list of SamTags
        public async Task<SamTagResponse> GetTags()
        {
            HttpClient client = new HttpClient();
            Uri domain = new Uri(_serverUrl + "get_usertags/");
            JsonObject tagRequestJson = new JsonObject();
            tagRequestJson.SetNamedValue("userID", JsonValue.CreateNumberValue(_userId));
            Windows.Web.Http.HttpStringContent httpFrame = new Windows.Web.Http.HttpStringContent(tagRequestJson.Stringify());

            try
            {

                HttpResponseMessage response = await client.PostAsync(domain, httpFrame);

                SamServerResponse result = AnalyzeResponse(response);
                if (result.successfull)
                {
                    return new SamTagResponse
                    {
                        successfull = true,
                        Tags = JsonConvert.DeserializeObject<List<SamTag>>(response.Content.ToString())
                    };
                }
                else
                {
                    //server error
                    return new SamTagResponse { successfull = false, ErrorMessage = result.ErrorMessage };
                }
             }
            catch (Exception)
            {
                //connection error
                return new SamTagResponse { successfull = false, ErrorMessage = GenericConnectionFailedResponse.ErrorMessage };
            }
        }

        //downloads user-trips on a tag and returns list of comparableTrips
        public async Task<SamComparableTripResonse> GetTrips(String tagName)
        {
            HttpClient client = new HttpClient();
            Uri domain = new Uri(_serverUrl + "get_usertrack/");
            JsonObject tagRequestJson = new JsonObject();
            tagRequestJson.SetNamedValue("tag", JsonValue.CreateStringValue(tagName));
            Windows.Web.Http.HttpStringContent httpFrame = new Windows.Web.Http.HttpStringContent(tagRequestJson.Stringify());
            try
            {
                HttpResponseMessage response = await client.PostAsync(domain, httpFrame);
                SamServerResponse result = AnalyzeResponse(response);
                if(result.successfull)
                {
                    return new SamComparableTripResonse
                    {
                        successfull = true,
                        Trip = JsonConvert.DeserializeObject<List<ComparableTrip>>(response.Content.ToString())
                    };
                }
                else  
                {
                    //server error
                    return new SamComparableTripResonse { successfull = false, ErrorMessage = result.ErrorMessage };
                }

            }
            catch (Exception)
            {
                //connection error
                return new SamComparableTripResonse { successfull = false, ErrorMessage = GenericConnectionFailedResponse.ErrorMessage };
            }

        }

        //transmits a trip to a user-account
        public async Task<SamServerResponse> TransmitTrip(List<SamPoint> points, String tag)
        {
            JsonObject _jsonTrip = new JsonObject();
            JsonArray _jsonPoints = new JsonArray();

            _jsonTrip.SetNamedValue("userID", JsonValue.CreateNumberValue(_userId));
            _jsonTrip.SetNamedValue("tag", JsonValue.CreateStringValue(tag));

            foreach (SamPoint point in points)
            {
                JsonObject jsonPoint = new JsonObject();
                jsonPoint.SetNamedValue("lat", JsonValue.CreateNumberValue(point.Latidude));
                jsonPoint.SetNamedValue("lon", JsonValue.CreateNumberValue(point.Longitude));
                jsonPoint.SetNamedValue("t", JsonValue.CreateNumberValue(point.Timestamp));
                jsonPoint.SetNamedValue("fuel", JsonValue.CreateNumberValue(point.Fuel));
                jsonPoint.SetNamedValue("d", JsonValue.CreateNumberValue(point.Distance));

                _jsonPoints.Add(jsonPoint);
            }
            _jsonTrip.SetNamedValue("points", _jsonPoints);

            try
            {
                var json_payload = _jsonTrip.Stringify();
                return await Post(json_payload);
            }
            catch (Exception)
            {
                return GenericConnectionFailedResponse;
            }
            
        }

        private SamServerResponse AnalyzeResponse(HttpResponseMessage response)
        {
            try
            {
                JObject json = JObject.Parse(response.Content.ToString());
                int error = 0;
                try
                {
                    error = json["err"].Value<int>(); //if err not in json, response is successfull
                }
                catch (Exception)
                {
                 
                }
                
                String serverMessage = "";
                try
                {
                    serverMessage = " (" + json["note"].Value<String>() + ")";
                }
                catch (Exception) { }
                String message = "Error: ";
                String tempMessage = "";
                switch (error)
                {
                    case 0: return new SamServerResponse { successfull = true };
                    case 100:
                        tempMessage = message + "Nutzer ist nicht authentifizert." + serverMessage;
                        return new SamServerResponse { successfull = false, ErrorMessage = tempMessage, ErrorCode = error };
                    case 110:
                        tempMessage = message + "Nutzer ist nicht registriert." + serverMessage;
                        return new SamServerResponse { successfull = false, ErrorMessage = tempMessage, ErrorCode = error };
                    case 140:
                        tempMessage = message + "Nutzer exsistiert bereits." + serverMessage;
                        return new SamServerResponse { successfull = false, ErrorMessage = tempMessage, ErrorCode = error };
                    case 150:
                        tempMessage = message + "Falsche Eingabedaten." + serverMessage;
                        return new SamServerResponse { successfull = false, ErrorMessage = tempMessage, ErrorCode = error };
                    case 170:
                        tempMessage = message + "Server-Fehler." + serverMessage;
                        return new SamServerResponse { successfull = false, ErrorMessage = tempMessage, ErrorCode = error };
                    case 200:
                        tempMessage = message + "Fehlerhafter Endpoint." + serverMessage;
                        return new SamServerResponse { successfull = false, ErrorMessage = tempMessage, ErrorCode = error };
                    default:
                        return new SamServerResponse { successfull = false, ErrorMessage = "Unkown Error", ErrorCode = 0 };
                }
            }
            catch (Exception)
            {
                //no json detected
                return new SamServerResponse { successfull = true};
            }
        }
    }
}
