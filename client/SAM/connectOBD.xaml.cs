using SAM.Common;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Graphics.Display;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

//page-specific imports--------------------------------
using Windows.Networking.Proximity; //Peerfinder
using Windows.Networking.Sockets; //StreamSocket
using Windows.Storage.Streams; //DataWriter
using Windows.Devices.Bluetooth.Rfcomm; //RfcommDeviceService
using Windows.Devices.Enumeration;
using Windows.System.Threading;
using Windows.Storage;
using Windows.UI.Core;
using System.Threading.Tasks;
using Windows.UI.Popups;

namespace SAM
{

    public sealed partial class connectOBD : Page
    {
        private NavigationHelper navigationHelper;
        private ObservableDictionary defaultViewModel = new ObservableDictionary();

        //-----------------members----------------------------//
        
        //bluetooth-socket
        private DeviceInformationCollection _rfcommDevices;
        private String _bluetoothID;
        private Boolean _autoconnect;
        //UID for OBD-Connection
        private static readonly Guid RfcommChatServiceUuid = Guid.Parse("00001101-0000-1000-8000-00805F9B34FB");
        ObdCommunication _obd;
        String _routeName;

        //-----------------NavigationHandling----------------------------//

        public connectOBD()
        {
            this.InitializeComponent();

            this.navigationHelper = new NavigationHelper(this);
            this.navigationHelper.LoadState += this.NavigationHelper_LoadState;
            this.navigationHelper.SaveState += this.NavigationHelper_SaveState;

            _autoconnect = ApplicationData.Current.LocalSettings.Values.ContainsKey("bluetoothPeer");
            if(_autoconnect)
            {
                _autoConnectCeckbox.IsChecked = true;
                _connectButton.Content = "Auto-Connect!";
                disableUserInteraction();
                _connectButton.IsEnabled = false;
                String id = ApplicationData.Current.LocalSettings.Values["bluetoothPeer"].ToString();
                connect(id);
            }
            else loadBluetoothPeers();
        }

        public NavigationHelper NavigationHelper
        {
            get { return this.navigationHelper; }
        }

        public ObservableDictionary DefaultViewModel
        {
            get { return this.defaultViewModel; }
        }

        private void NavigationHelper_LoadState(object sender, LoadStateEventArgs e){}

        private void NavigationHelper_SaveState(object sender, SaveStateEventArgs e){}

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);
            _routeName = (String)e.Parameter;

            loadBluetoothPeers();
        }

        //-----------------User Events----------------------------//

         private async void systemBluetoothButton_Click(object sender, RoutedEventArgs e)
        {
            await Windows.System.Launcher.LaunchUriAsync(new Uri("ms-settings-bluetooth:"));
        }

        private async Task connect(String id)
        { 
            _obd = new ObdCommunication();
            _connectButton.Content = "Verbinde OBD...";
            disableUserInteraction();

            (App.Current as App).Obd = _obd;
            Boolean successfull = false;
              
            successfull = await (App.Current as App).Obd.establishConnection(id);
            
            if (successfull)
            {
                if (_autoconnect)
                {
                    ApplicationData.Current.LocalSettings.Values["bluetoothPeer"] = id;
                }
                else
                {
                    ApplicationData.Current.LocalSettings.Values.Remove("bluetoothPeer");
                }
                _bluetoothID = id;
                Frame.Navigate(typeof(TrackerPage), _routeName);
            }
            else //Fehler
            {
                ApplicationData.Current.LocalSettings.Values.Remove("bluetoothPeer");
                _connectButton.Content = "Verbindung aufbauen";
                enableUserInteraction();
                _connectButton.IsEnabled = true;
                var emailErrorDialog = new MessageDialog("Fehler beim Aufbau der OBD Verbindung. Adapter neustarten und erneut versuchen! ");
                emailErrorDialog.Commands.Add(new UICommand("ok"));
                await emailErrorDialog.ShowAsync();    
            }

        }

        private async void connectButton_Click(object sender, RoutedEventArgs e)
        {
            _autoconnect = _autoConnectCeckbox.IsChecked.Value;
            var obdPeer = _rfcommDevices[_selectBluetoothPeerBox.SelectedIndex];
            await connect(obdPeer.Id);

               
          //  _saveButton.IsEnabled = true;
       }

        //-----------------private functions----------------------------//

        private async void loadBluetoothPeers()
        {
            _rfcommDevices = await DeviceInformation.FindAllAsync(
               RfcommDeviceService.GetDeviceSelector(RfcommServiceId.FromUuid(RfcommChatServiceUuid)));

            if (_rfcommDevices.Count > 0)
            {
                List<string> peerNames = new List<string>();
                foreach (var chatServiceInfo in _rfcommDevices)
                {
                    peerNames.Add(chatServiceInfo.Name);
                }

                _selectBluetoothPeerBox.ItemsSource = peerNames;

                if (ApplicationData.Current.LocalSettings.Values.ContainsKey("obd"))
                {
                    String obdPeerId = ApplicationData.Current.LocalSettings.Values["obd"].ToString();
                    int i = 0;
                    foreach (var chatServiceInfo in _rfcommDevices)
                    {
                        if (chatServiceInfo.Id == obdPeerId)
                        {
                            _selectBluetoothPeerBox.SelectedIndex = i;
                        }
                        i++;
                    }
                }
                    
                _connectButton.IsEnabled = true;
            }
        }

        private void disableUserInteraction()
        {
            _connectButton.IsEnabled = false;
            _selectBluetoothPeerBox.IsEnabled = false;
            _systemBluetoothButton.IsEnabled = false;
        }

        private void enableUserInteraction()
        {
            _connectButton.IsEnabled = true;
            _selectBluetoothPeerBox.IsEnabled = true;
            _systemBluetoothButton.IsEnabled = true;
        }
        
      
    } //class
} //namespace
