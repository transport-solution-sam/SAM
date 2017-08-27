using SAM.Common;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Devices.Geolocation;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Graphics.Display;
using Windows.UI;
using Windows.UI.Popups;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Maps;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;


namespace SAM
{
  
    public sealed partial class TripSummaryPage : Page
    {
        private NavigationHelper navigationHelper;
        private ObservableDictionary defaultViewModel = new ObservableDictionary();

        //-----------------Members----------------------------//
        private Trip _trip;
        private IConsumption _consumptionCalculator;

        //-----------------Constructor-----------------------//
        public TripSummaryPage()
        {
            this.InitializeComponent();

            this.navigationHelper = new NavigationHelper(this);
            this.navigationHelper.LoadState += this.NavigationHelper_LoadState;
            this.navigationHelper.SaveState += this.NavigationHelper_SaveState;          
        }

        //-----------------NavigationHandling-------------------------//
        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);
            var parameter = (Tuple<Trip, IConsumption>)e.Parameter;
            _trip = parameter.Item1;
            _consumptionCalculator = parameter.Item2;
            setGUI();
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


        //-------------------private functions-----------------------------//

        private void setGUI()
        {
            _distanceLabel.Text = _trip.DistanceInM.ToString("0 m");
            _timeLabel.Text = _trip.Duration.ToString(@"hh\:mm\:ss");
            _avgSpeedLabel.Text = _trip.AvgSpeedInKmh.ToString("0.0 km/h");
            _avgConsumptionLabel.Text = _trip.AvgConsumptionInLKm.ToString("0.0") + " l/100km";
            _map.MapElements.Add(
                new MapPolyline
                {
                    Path = new Geopath(_trip.PositionList),
                    StrokeThickness = 7,
                    StrokeColor = Colors.Gray
                });
        }

        private void _discardButton_Click(object sender, RoutedEventArgs e)
        {
            Frame.Navigate(typeof(TrackerPage));
        }

        private async void _submitButton_Click(object sender, RoutedEventArgs e)
        {
            SamServerResponse response = await _trip.submitPoints();
            if(response.successfull)
            {
                var successDialog = new MessageDialog("Der Trip wurde erfolgreich an dem SAM-Server übertragen.");
                successDialog.Commands.Add(new UICommand("ok"));
                await successDialog.ShowAsync();
            }
            else
            {
                var dialog = new MessageDialog(response.ErrorMessage);
                dialog.Commands.Add(new UICommand("ok"));
                await dialog.ShowAsync();
            }
        }


        private void Page_Loaded(object sender, RoutedEventArgs e)
        {
            _map.TrySetViewBoundsAsync(GeoboundingBox.TryCompute(_trip.PositionList), null, MapAnimationKind.Bow);
        }

    }
}
