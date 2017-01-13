(function () {
    'use strict';

    angular
        .module('smoothieApp')
        .controller('FileCtrl', FileCtrl);

    FileCtrl.$inject = ['DataService', 'Upload'];
    var currentRoot = "/sd/";
    function showbutton(){
        if (currentRoot == "/ext/") return false;
        else return true;
    }
    function FileCtrl(DataService, Upload) {
        var vm = this;

        vm.fileList = [];
        vm.currentUploadedFile = {};
        vm.currentRoot = currentRoot;
        vm.refreshFiles = refreshFiles;
        vm.print = print;
        vm.progress = progress;
        vm.abort = abort;
        vm.uploadFile = uploadFile;
        vm.deleteFile = deleteFile;
        vm.showbutton = showbutton;
         vm.visible_for = visible_for;

        activate();

        ////////////////

    function visible_for(targetname){
        if (targetname.toLowerCase() == target_firmware.toLowerCase()) return true;
        else return false;
    }

        function activate() {
             if (target_firmware.toLowerCase() != "smoothieware")currentRoot = "";
             refreshFiles(currentRoot);
        }

        function refreshFiles(rootsd) {
            console.log('RefreshFiles');
            var command_refresh="";
            if(currentRoot != rootsd)vm.fileList = [];
            currentRoot = rootsd;
            document.getElementById("root_sd").innerHTML=currentRoot;
            if (currentRoot == "") command_refresh="M20";
            else command_refresh="ls " + rootsd;
            DataService.runCommand(command_refresh)
                .then(function (result_data) {
                    parseFilelist(result_data);
                }, function (error) {
                    console.error(error.statusText);
                });
        }

        function parseFilelist(rawdata) {
            vm.fileList = [];
            var list = rawdata.split('\n');
            angular.forEach(list, function(value, key) {
                if (target_firmware.toLowerCase() == "repetier" || target_firmware.toLowerCase() == "repetier_davinci"){
                    var sublist = value.split(' ');
                    value = sublist[0];
                }
                value = value.trim();
                if (value.toLowerCase().match(/\.g(code)?$/) || value.toLowerCase().match(/\.gco(de)?$/)) {
                    var file = {filename: value, uploading: false, percentage: 0};
                    vm.fileList.push(file);
                }
            });
        }

        function print(file) {
            console.log('print file - ' + currentRoot + file);
            var command_to_use = "play " + currentRoot + file;
             if (target_firmware.toLowerCase() != "smoothieware"){
                 command_to_use = "M24";
                 DataService.runCommand('M23 ' + file)
                .then(function (result) {
                    console.log('Result: ' + result);
                });
                 
             }

            DataService.runCommand(command_to_use)
                .then(function (result) {
                    console.log('Result: ' + result);
                });
        }

        function progress() {
             var command_to_use = "progress";
             if (target_firmware.toLowerCase() != "smoothieware")command_to_use = "M27";
            DataService.runCommand(command_to_use)
                .then(function (result_data) {
                    DataService.broadcastCommand(result_data);
                }, function (error) {
                    console.error(error.statusText);
                });
        }

        function abort() {
            var command_to_use = "abort";
            if (target_firmware.toLowerCase() != "smoothieware")command_to_use = "M112";
            DataService.runCommand(command_to_use)
                .then(function (result_data) {
                    DataService.broadcastCommand(result_data);
                }, function (error) {
                    console.error(error.statusText);
                });
        }

        function uploadFile(file) {
            if (file) {
                DataService.broadcastCommand("Uploading: " + file.name + "\n");

                vm.currentUploadedFile = {filename: file.name, uploading: true, percentage: 0};
                vm.fileList.push(vm.currentUploadedFile);

                Upload.upload({
                    url: '/upload',
                    method: 'POST',
                    data: { 
                        file: file,
                        'X-Filename': file.name
                    }
                }).then(function (resp) {
                    DataService.broadcastCommand('Upload successful\n');
                    vm.currentUploadedFile.uploading = false;
                    currentRoot="/ext";
                    delay(1000);
                    vm.refreshFiles(currentRoot);
                }, function (resp) {
                    DataService.broadcastCommand('Error status: ' + resp.status + "\n");
                }, function (evt) {
                    var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                    vm.currentUploadedFile.percentage = progressPercentage;
                    console.log('Progress: ' + progressPercentage + '%');
                });
            }
        }

        function deleteFile(file) {
             var command_to_use ="rm " + currentRoot + file.filename;
            if (target_firmware.toLowerCase() != "smoothieware")command_to_use = "M30 "  + file.filename;
            DataService.runCommand(command_to_use)
                .then(function (result_data) {
                    DataService.broadcastCommand("Deleted file: " + currentRoot + file.filename + "\n");
                    vm.refreshFiles(currentRoot);
                }, function (error) {
                    console.error(error.statusText);
                });
        }
    }
}());
