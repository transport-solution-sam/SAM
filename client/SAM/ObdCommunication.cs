using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Windows.Devices.Bluetooth.Rfcomm;
using Windows.Networking.Sockets; //DataWriter
using Windows.Storage;
using Windows.Storage.Streams;

using System.Diagnostics; //Debug.Write

namespace SAM
{
    public class ObdCommunication   //don't call directly
    {
        private DataWriter _writer;
        private DataReader _reader;
        int _timeoutThreshold;
        private StreamSocket _chatSocket;
        private RfcommDeviceService _chatService;

        public ObdCommunication()
        {
            _timeoutThreshold = 0;
        }

        public async Task<Boolean> establishConnection(String deviceId)
        {
            try
            {
            _chatService = await RfcommDeviceService.FromIdAsync(deviceId);

            lock (this)
            {
                _chatSocket = new StreamSocket();
            }

            await _chatSocket.ConnectAsync(_chatService.ConnectionHostName, _chatService.ConnectionServiceName);
            _writer = new DataWriter(_chatSocket.OutputStream);
            _reader = new DataReader(_chatSocket.InputStream);
            _reader.InputStreamOptions = InputStreamOptions.Partial;

        
                var version = await initAdapter();
                ApplicationData.Current.LocalSettings.Values["obd"] = deviceId;

                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        private async void reconnect()
        {
            try
            {
                Debug.WriteLine("Reconnect!");
                _chatSocket.Dispose();
                await _chatSocket.ConnectAsync(_chatService.ConnectionHostName, _chatService.ConnectionServiceName);
                _writer = new DataWriter(_chatSocket.OutputStream);
                _reader = new DataReader(_chatSocket.InputStream);
                _reader.InputStreamOptions = InputStreamOptions.Partial;
        
            }
            catch (Exception e) 
                {
                    Debug.WriteLine("Reconnect Exception: " + e.Message);
                }
            }

        private async Task<string> initAdapter()
        {
            //Don't change order
            String version = await getParameter(new reset());
            //await getParameter(new disableEcho());
            await getParameter(new autoProtocoll());
            return version;
        }

        public async Task<List<String>> getParameters(List<ObdCommand> parameters)
        {
            List<String> results = new List<String>();
            foreach (ObdCommand parameter in parameters)
            {
                results.Add(await getParameter(parameter));
            }
            return results;
        }

        public async Task<String> getParameter(ObdCommand parameter)
        {
            var result = parameter.interpretResponse(await getValue(parameter.AsciiCode));
            
            return result;
        }

        //don't call directly
        private async Task<String> getValue(String asciiCode)
        {
            try
            {
                String command = asciiCode + "\r\n";
                System.Diagnostics.Debug.WriteLine($"Sended Message {command}");
                _writer.WriteString(command);
                await _writer.StoreAsync();
                return await receiveMessage();            }
            catch (Exception e)
            {
               System.Diagnostics.Debug.WriteLine("While sending following exception occured:" + e.Message);
               // reconnect();
               // return e.Message;
                return "0";
            }
        }
        
        //don't call directly
        private async Task<String> receiveMessage()
        {
            //await Task.Delay(50);

            String response = "";

            await _reader.LoadAsync(1);

            while (_reader.UnconsumedBufferLength > 0)
            {
               // _reader.LoadAsync(1);
                String byteString = _reader.ReadString(1);
                response += byteString;

                if (byteString == ">")
                {
                   // System.Diagnostics.Debug.WriteLine($"Received Message {response}");
                    return response;
                }

                await _reader.LoadAsync(1);
            }
            // System.Diagnostics.Debug.WriteLine($"Received Message {response}");
            return response;
        }
    }
}



    