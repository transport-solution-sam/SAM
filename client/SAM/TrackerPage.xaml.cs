using System;
using Windows.Foundation;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;

using Windows.Devices.Geolocation; //using MAP
using Windows.UI.Xaml.Controls.Maps; //using SolidColorBrush //using BrushConverter
using System.Threading;
using Windows.UI.Core; //using DispatcherTimer
using Windows.UI;
using System.Collections.Generic;
using System.Collections;
using Windows.UI.Xaml.Shapes; //using Color
using Windows.Storage.Streams;
using Windows.Services.Maps;
using Windows.UI.ViewManagement;
using Windows.System.Display; //using RandomAccessStreamReference
using Windows.System.Threading;
using Windows.UI.Popups;
using Windows.Storage;
using SAM.Common;
using System.Threading.Tasks;

namespace SAM
{
  
    public sealed partial class TrackerPage : Page
    {
        private NavigationHelper navigationHelper;
        private ObservableDictionary defaultViewModel = new ObservableDictionary();

        //--------------------Member-Variables----------------------------------//
        private bool _tracking = false;
        private DispatcherTimer _timer = new DispatcherTimer();
        Trip _currentTrackingProcess = null;
        private DisplayRequest _dispRequest = null;

        Geolocator _trackingGeolocator = null; 
        Geoposition _lastPosition;
        int _geolocationCounter = 0;
        ObdCommunication _obd;
        IAsyncAction _obdThread;
        String _routeName;
        bool _stopTracking = false;

        DieselConsumption _consumptionCalculator;

       
      //-----------------------constructor---------------------------------------//
        public TrackerPage()
        {
            this.InitializeComponent();
            this.navigationHelper = new NavigationHelper(this);
            initGPS();
            initTimer();
            initObd();
           
            //avoid screen from locking
            _dispRequest = new DisplayRequest();
            _dispRequest.RequestActive();  
        }

        //-----------------------navigation---------------------------------------//

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
             base.OnNavigatedTo(e);
            _routeName = (String)e.Parameter;
            _routeNameLabel.Text = "SAM Trip: " + _routeName;
        }

        public NavigationHelper NavigationHelper
        {
            get { return this.navigationHelper; }
        }

        public ObservableDictionary DefaultViewModel
        {
            get { return this.defaultViewModel; }
        }

        //----------------------init-functions-----------------------------------//


        private void initObd()
        {
            _obd = (App.Current as App).Obd;

            _obdThread = Windows.System.Threading.ThreadPool.RunAsync((source) =>
            {
                consumptionTracker();

            }, WorkItemPriority.High);
        }

        private async void initGPS()
        {
            //init gps-signal

            try
            {
                var gl = new Geolocator() { DesiredAccuracyInMeters = (20) };
                _lastPosition = await gl.GetGeopositionAsync();
                _startButton.IsEnabled = true;
                _startButton.Content = "Trip starten!";

                //persistent Geolocator
                _trackingGeolocator = new Geolocator();
                _trackingGeolocator.DesiredAccuracy = PositionAccuracy.High;
                _trackingGeolocator.MovementThreshold = 3;
                _trackingGeolocator.StatusChanged += trackingGeolocator_StatusChanged;
                _trackingGeolocator.PositionChanged += trackingGeolocator_PositionChanged;
            }
            catch (System.Exception)
            {
                Windows.System.Launcher.LaunchUriAsync(new Uri("ms-settings-location:"));
            }
        }

        private void initTimer()
        {
            //timer
            _timer.Interval = TimeSpan.FromSeconds(1);
            _timer.Tick += _timer_Tick;
            _timer.Start();
        }



        //------------------------------User-Events--------------------------------------//

        private void StartButton_Click(object sender, RoutedEventArgs e)
        {
            startStop();
        }
        

        //------------------------------------Tracking-------------------------------------//

     

        private void startStop()
       {
           if (!_tracking) //start tracking!
           {
               _tracking = true;
               _startButton.Content = "Trip beenden";
               _currentTrackingProcess = new Trip(_routeName, System.Environment.TickCount);

               if (_currentTrackingProcess.CountPoints > 0)
                   setPosition(_lastPosition);
           }
           else //stop tracking & open tripSummaryPage!
           {
               _tracking = false;
               _stopTracking = true;
               _dispRequest.RequestRelease();
               _obdThread.Cancel();
               Frame.Navigate(typeof(TripSummaryPage), new Tuple<Trip, IConsumption>(_currentTrackingProcess, _consumptionCalculator));
           }
       }

       async void trackingGeolocator_PositionChanged(Geolocator sender, PositionChangedEventArgs args)
       {
           try
           {
               await this.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () =>
                {
                    setPosition(args.Position);
                });
           }
           catch(Exception){};
       }

       private async void setPosition(Geoposition Position)
       {
           _lastPosition = Position;


           if ((_geolocationCounter++ % 10) == 0)
           {
               try
               {
                   MapLocationFinderResult result = await MapLocationFinder.FindLocationsAtAsync(Position.Coordinate.Point);
                   if (result.Locations.Count > 0)
                       _streetLabel.Text = result.Locations[0].Address.Street;
               }
               catch (Exception) { }
           }

           if (_tracking)
           {
               TimeSpan unixTime = DateTime.Now.Subtract(new DateTime(1970, 1, 1));

               //consumption calculation
               var consumptions = _consumptionCalculator.getConsumption();
               double consumptionValue = consumptions.Item1;
               consumptionValue *= 1000;
               double referenceConsumptionValue = consumptions.Item2;

               _currentTrackingProcess.addPosition(Position.Coordinate.Point.Position, unixTime.TotalSeconds, (int)consumptionValue, (int)referenceConsumptionValue);
               _distanceLabel.Text = _currentTrackingProcess.DistanceInM.ToString("0 m");
               _pointCountLabel.Text = _currentTrackingProcess.CountPoints.ToString();
               _avgConsumptionLabel.Text = _currentTrackingProcess.AvgConsumptionInLKm.ToString("0.0 l/") + "100km";
           };
       }


       void _timer_Tick(object sender, object e)
       {
           if (_tracking)
           {
               _currentTrackingProcess.refreshTimeInS(System.Environment.TickCount);
               _timeLabel.Text = _currentTrackingProcess.Duration.ToString(@"hh\:mm\:ss");
               _avgSpeedLabel.Text = _currentTrackingProcess.AvgSpeedInKmh.ToString("0.0 km/h");
           }
       }

       private async void consumptionTracker()
       {
            double m = (App.Current as App)._consumptionCoefficient;
            double n = (App.Current as App)._consumptionOffset;

            _consumptionCalculator = new DieselConsumption(m, n);
            

            while (!_stopTracking)
           {
                List<ObdCommand> parameters = _consumptionCalculator.getObdCommands();
                parameters.Add(new speed());

                try
               {
                   var result = await _obd.getParameters(parameters);
                    _consumptionCalculator.addConsumptionPoint(result);

                    var speedResult = result[result.Count-1];

                    await this.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () =>
                    {
                        _speedLabel.Text = speedResult;
                        _consumptionLabel.Text = _consumptionCalculator.displayConsumption().ToString("0.0");
                    });
                   
               }
               catch (Exception e)
               {
                    System.Diagnostics.Debug.WriteLine(e.Message);
                    await this.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () =>
                    {
                        _speedLabel.Text = "--";
                        _consumptionLabel.Text = "--";
                    });
                    //return;
                } 
           }

            return;
       }    

       void trackingGeolocator_StatusChanged(Geolocator sender, StatusChangedEventArgs args){}


       private void Current_SizeChanged(object sender, SizeChangedEventArgs e)
       {
           string CurrentViewState = ApplicationView.GetForCurrentView().Orientation.ToString();
           if (CurrentViewState == "Portrait")
           {
               Grid.SetColumnSpan(_statusPanel, 2);
               Grid.SetRowSpan(_statusPanel, 1);

               Grid.SetColumn(_tripPanel, 0);
               Grid.SetRow(_tripPanel, 2);
               Grid.SetColumnSpan(_tripPanel, 2);
               Grid.SetRowSpan(_tripPanel, 1);
               _tripPanel.HorizontalAlignment = Windows.UI.Xaml.HorizontalAlignment.Left;
           }

           if (CurrentViewState == "Landscape")
           {
               Grid.SetColumnSpan(_statusPanel, 1);
               Grid.SetRowSpan(_statusPanel, 2);

               Grid.SetColumn(_tripPanel, 2);
               Grid.SetRow(_tripPanel, 0);
               Grid.SetColumnSpan(_tripPanel, 1);
               Grid.SetRowSpan(_tripPanel, 2);
               _tripPanel.HorizontalAlignment = Windows.UI.Xaml.HorizontalAlignment.Right;
           }
       }
    }
}
